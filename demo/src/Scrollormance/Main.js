define(['Jquery', 'Underscore', 'Backbone', 'Jquery/Mousewheel'], function ($, _, Backbone, Mousewheel) {
    'use strict';


    var Scrollormance = function (element, viewportHeight, viewportWidth, contentHeight, contentWidth) {

        this.element = element;
        this.$element = $(element);

        this.$scrollElement = this.$element.find('>');

        this.scrollElement = this.$scrollElement.get(0);

        this.model = new Backbone.Model({
            viewportHeight: viewportHeight,
            viewportWidth: viewportWidth,
            contentHeight: contentHeight,
            contentWidth: contentWidth,

            // The scale ration between the viewport and the content height
            // used calculation the drag-bar size and the number of pixels to scroll on drag-bar drag
            scrollYMagnitude: 0,
            scrollXMagnitude: 0,

            // The position of the scroll on the Y axis, 'scrollTop'
            scrollY: 0,
            scrollX: 0,
            scrollingY: false,
            scrollingX: false
        });

        this._calcMagnitudes();
        this._calcOverflow();

        this._preaperScrollDom();
        this._observeChanges();

        this._dragEvents();
        this._scrollWheelOverTrackEvents();
        this._nativeScrollEvents();

        this._ifOverflow();
    };

    Scrollormance.prototype = {

        update: function (params) {
            var updateable = [
                'viewportHeight',
                'viewportWidth',
                'contentHeight',
                'contentWidth'
            ];

            this.model.set(_.pick(params, updateable));
            this._calcOverflow();
        },

        lazyUpdate: function () {
            /*
                The scrollHeight/Width are always bigger in X px then they should be,
                So we are getting "overflow" when we don't need to.
                We need to subtract this magic number value.
                in chrome its 5px
                in ff its 7px
                in IE9 its 3px
                in IE8 its 3px

                I don't want to use browser detection here so I'll just go with the biggest value
             */
            var magicNumber = 15,
                update = {
                    viewportHeight: this.$scrollElement.height(),
                    viewportWidth: this.$scrollElement.width(),
                    contentHeight: this.scrollElement.scrollHeight - magicNumber,
                    contentWidth: this.scrollElement.scrollWidth - magicNumber
               };

            this.model.set(update);
            this._calcOverflow();
        },

        onScrollY: function (callback) {
            this.onScrollYCallback = callback;
        },

        destroy: function () {
            this.$scrollElement.off('scroll.custom-scrollbar');
            this.$scrollDom.drag.off('mousedown.custom-scrollbar');
            $(document).off('.custom-scrollbar');
            this.$scrollDom.trackY.off('mousewheel.custom-scrollbar');
            this.topLevelScrollDom.remove();
        },

        _nativeScrollEvents: function () {
            this.$scrollElement.on('scroll.custom-scrollbar', _.partial(this._scrollEventHandler, this));
        },

        _dragEvents: function () {
            var pageY = 0,
            mouseUpHandler = function (instance, axis, event) {
                instance.model.set('scrolling' + axis, false);

                $(document).off('mousemove.custom-scrollbar');
            },
            mouseDownHandler = function (instance, axis, event) {
                pageY = event.pageY;

                instance.model.set('scrolling' + axis, true);
                $(document).one('mouseup.custom-scrollbar', _.partial(mouseUpHandler, instance, axis));

                $(document).on('mousemove.custom-scrollbar', function (event) {
                    var draggedPixels = event.pageY - pageY,
                        draggedPixelsScaled = draggedPixels * instance.model.get('scrollYMagnitude'),
                        newScrollY = Math.min(Math.max(instance.model.get('scrollY') + draggedPixelsScaled, 0), instance.model.get('contentHeight') - instance.model.get('viewportHeight'));

                    instance.model.set('scrollY', newScrollY);

                    pageY = event.pageY;
                });
            };

            this.$scrollDom.dragY.on('mousedown.custom-scrollbar', _.partial(mouseDownHandler, this, 'Y'));
        },

        _scrollWheelOverTrackEvents: function () {
            var instance = this, mousewheelOnScrollbarDelta = 0, updateFromMousewheelOnScrollbar = _.debounce(function () {
                var newScrollY = Math.min(Math.max(instance.model.get('scrollY') + mousewheelOnScrollbarDelta * 50, 0), instance.model.get('contentHeight') - instance.model.get('viewportHeight'));

                instance.model.set('scrollingY', true, {silent: true});
                instance.model.set('scrollY', newScrollY);
                instance.model.set('scrollingY', false, {silent: true});

                mousewheelOnScrollbarDelta = 0;
            }, 10);

            this.$scrollDom.trackY.on('mousewheel.custom-scrollbar', function (event, delta) {
                mousewheelOnScrollbarDelta += (delta * -1);
                updateFromMousewheelOnScrollbar();
            });
        },

        _preaperScrollDom: function () {

            // @todo Add support for attaching to an existent scrollbar DOM
            this.topLevelScrollDom = this._getDom();

            this.$scrollDom = {
                container: this.topLevelScrollDom,
                trackY: this.topLevelScrollDom.find('.track-y'),
                trackX: this.topLevelScrollDom.find('.track-x'),
                dragY: this.topLevelScrollDom.find('.track-y .drag'),
                dragX: this.topLevelScrollDom.find('.track-x .drag')
            };

            this._updateDragHeight();

            this.$element.append(this.topLevelScrollDom);
        },

        _getDom: function () {
            var str = [
                '<div class="custom-scroll-container">',
                    '<div class="track track-y"><div class="drag"></div></div>',
                    '<div class="track track-x"><div class="drag"></div></div>',
                '</div>'
            ].join('');

            return $(str);
        },

        _updateDragHeight: function () {
            this.$scrollDom.dragY.height(this._calcDragHeight());
        },

        _calcDragHeight: function () {
            return Math.min(Math.floor(this.model.get('viewportHeight') / this.model.get('scrollYMagnitude')), this.model.get('viewportHeight'));
        },

        _updateScrollbarContainerGeometrics: function () {
            var positionInPx;

            positionInPx = this.model.get('scrollY');

            this.$scrollDom.container.css({
                top: positionInPx + 'px',
                height: this.model.get('viewportHeight')
            });
        },

        _updateDragPosition: function () {
            var positionInPx;

            positionInPx = Math.floor(this.model.get('scrollY') / this.model.get('scrollYMagnitude'));

            this.$scrollDom.dragY.css({
                top: positionInPx + 'px'
            });
        },

        _scrollEventHandler: function (instance, event) {
            // If the event was trigged by us changing the the scrollTop/left ignore it
            // We can tell that by checking if we are in a scrolling operation (Dragging the drag bar or using the muse wheel over it)
            if (!instance.model.get('scrollingY')) {
                instance.model.set({
                    scrollX: this.scrollLeft,
                    scrollY: this.scrollTop
                });
            }
        },

        _observeChanges: function () {
            this.model.on('change', this._modelChangesHandler, this);
        },

        _modelChangesHandler: function () {
            var changed = this.model.changedAttributes();

            if (changed.hasOwnProperty('scrollY')) {
                if (this.model.get('scrollingY')) {
                    this.$scrollElement.scrollTop(changed.scrollY);
                }

                this._updateDragPosition();

                if (this.onScrollYCallback !== undefined) {
                    this.onScrollYCallback.apply(null, [this.model.get('scrollY'), this.model.get('contentHeight'), this.model.get('viewportHeight')]);
                }
            }

            if (changed.hasOwnProperty('viewportHeight') || changed.hasOwnProperty('contentHeight')) {
                this._calcMagnitudes();
                this._updateDragHeight();
                this._updateDragPosition();
            }

            if (changed.hasOwnProperty('overflowY')) {
                this._ifOverflow();
            }
        },

        _calcMagnitudes: function () {
            this.model.set({
                scrollYMagnitude: this.model.get('contentHeight') / this.model.get('viewportHeight'),
                scrollXMagnitude: this.model.get('contentWidth') / this.model.get('viewportWidth')
            }, {
                silent: true
            });
        },

        _calcOverflow: function () {
            this.model.set({
                overflowY: this.model.get('contentHeight') > this.model.get('viewportHeight'),
                overflowX: this.model.get('contentWidth') > this.model.get('viewportWidth')
            });
        },

        _ifOverflow: function () {
            if (this.model.get('overflowY')) {
                this.$element.removeClass('no-overflow-y');
            } else {
                this.$element.addClass('no-overflow-y');
            }

            if (this.model.get('overflowX')) {
                this.$element.removeClass('no-overflow-x');
            } else {
                this.$element.addClass('no-overflow-x');
            }
        }
    };

    return Scrollormance;
});
