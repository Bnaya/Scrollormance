(function (root, factory) {
    if (typeof define == 'function' && define.amd) {
        define(['jquery', 'underscore'], factory);
    } else {
        root.Scrollormance = factory(root.$, root._);
    }
}(this, function ($, _) {
    'use strict';

      var CustomScrollbar = function (element, paramOptions) {

        var defaultOptions = {
            viewportHeight: 0,
            viewportWidth: 0,
            contentHeight: 0,
            contentWidth: 0
        }, options = _.extend({}, defaultOptions, paramOptions);

        this.element = element;
        this.$element = $(element);

        this.$scrollElement = this.$element.find('>');

        this.scrollElement = this.$scrollElement.get(0);

        this.vars = {
            viewportHeight: options.viewportHeight,
            viewportWidth: options.viewportWidth,
            contentHeight: options.contentHeight,
            contentWidth: options.contentWidth,

            // The scale ration between the viewport and the content height
            // used calculation the drag-bar size and the number of pixels to scroll on drag-bar drag
            scrollYMagnitude: 0,

            // The position of the scroll on the Y axis, 'scrollTop'
            scrollY: 0,

            // The position of the drag on the track, the top css value
            dragYPosition: 0,

            // Are we currently scrolling
            scrollingY: false
        };

        this.prepareScrollDom();

        this.dragEvents();
        this.scrollWheelOverTrackEvents();
        this.clickOnTrackEvents();
        this.nativeScrollEvents();
    };

    CustomScrollbar.prototype = {

        /**
         * Update the scrollbar with a given information
         *
         * @public
         *
         * @param  {Options} params
         */
        update: function (params) {
            var updateable = [
                'viewportHeight',
                'viewportWidth',
                'contentHeight',
                'contentWidth'
            ], update = _.pick(params, updateable);

            update.overflowY = update.contentHeight > update.viewportHeight;
            update.scrollYMagnitude = update.contentHeight / update.viewportHeight;

            this.setVars(update);
        },

        /**
         * Tell the scrollbar to update itself by taking information from the DOM
         *
         * @public
         */
        lazyUpdate: function () {
            var update = {
                viewportHeight: this.$scrollElement.height(),
                viewportWidth: this.$scrollElement.width(),
                contentHeight: this.scrollElement.scrollHeight,
                contentWidth: this.scrollElement.scrollWidth
            };

            this.update(update);
        },

        /**
         * Set a handler for scroll Y events
         *
         * @public
         *
         * @param  {ScrollYCallback} callback The handler callback
         */
        onScroll: function (callback) {
            this.onScrollCallback = callback;
        },

        /**
         * Get the current vertical position of the scroll bar,
         * or set the vertical position of the scroll bar.
         *
         * @public
         *
         * @param  {integer} [y] The scroll top value to set
         *
         * @return {integer|void} The current value of scrollTop
         */
        scrollTop: function (y) {
            return this.$scrollElement.scrollTop(y);
        },

        /**
         * Clear all the things related to the CustomScrollbar instance
         *
         * @public
         */
        destroy: function () {
            this.$scrollDom.container.off('selectstart.custom-scrollbar');
            this.$scrollElement.off('scroll.custom-scrollbar');
            this.$scrollDom.dragY.off('mousedown.custom-scrollbar');
            $(document).off('.custom-scrollbar');
            this.$scrollDom.trackY.off('mousewheel.custom-scrollbar');
            this.$scrollDom.trackY.off('click.custom-scrollbar');
            this.$scrollDom.container.remove();
            this.$scrollDom = null;
        },

        setVars: function (varToSet) {
            var changed = {};

            _.each(this.vars, function (value, varName) {
                if (varToSet.hasOwnProperty(varName) && varToSet[varName] !== value) {
                    changed[varName] = varToSet[varName];
                    this.vars[varName] = varToSet[varName];
                }
            }, this);

            this.varsChangesHandler(changed);
        },

        /**
         * Listen on the scroll events on our scrolled element.
         * Scroll event can happen when the user is scrolling the element with scroll wheel, keyboard, and more
         *
         * @private
         */
        nativeScrollEvents: function () {
            this.$scrollElement.on('scroll.custom-scrollbar', _.partial(this.scrollEventHandler, this));
        },

        /**
         * Listen & handle the drag events of the track bar
         *
         * @private
         */
        dragEvents: function () {
            var pageY = 0,
            mouseUpHandler = function (instance, axis) {
                var toSet = 'scrolling' + axis;

                instance.setVars({
                    toSet: false
                });

                $(document).off('mousemove.custom-scrollbar');
            },
            mouseDownHandler = function (instance, axis, event) {
                var toSet = 'scrolling' + axis;

                pageY = event.pageY;

                instance.setVars({
                    toSet: false
                });

                $(document).one('mouseup.custom-scrollbar', _.partial(mouseUpHandler, instance, axis));

                $(document).on('mousemove.custom-scrollbar', _.debounce(function (event) {
                    var draggedPixels = event.pageY - pageY,
                        draggedPixelsScaled = draggedPixels * instance.vars.scrollYMagnitude,
                        newScrollY = Math.min(Math.max(instance.vars.scrollY + draggedPixelsScaled, 0), instance.vars.contentHeight - instance.vars.viewportHeight);

                    instance.scrollTop(newScrollY);

                    pageY = event.pageY;
                }, 5));
            };

            this.$scrollDom.dragY.on('mousedown.custom-scrollbar', _.partial(mouseDownHandler, this, 'Y'));

            // Disable page content selection on IE
            this.$scrollDom.container.on('selectstart.custom-scrollbar', function (e) {
                e.preventDefault();
            });
        },

        /**
         * Listen & handle scroll wheel events when its over the custom scrollbar track/drag
         *
         * @private
         */
        scrollWheelOverTrackEvents: function () {
            var mousewheelOnScrollbarDelta = 0,
                updateFromMousewheelOnScrollbar = _.debounce(_.bind(function () {
                    var newScrollY = Math.min(Math.max(this.vars.scrollY + mousewheelOnScrollbarDelta * 75, 0), this.vars.contentHeight - this.vars.viewportHeight);

                    this.scrollTop(newScrollY);

                    mousewheelOnScrollbarDelta = 0;
                }, this), 10);

            this.$scrollDom.trackY.on('mousewheel.custom-scrollbar', function (event, delta) {
                mousewheelOnScrollbarDelta += (delta * -1);
                updateFromMousewheelOnScrollbar();

                // Just to overcome jslint error...
                return event;
            });
        },

        /**
         * Listen & handle clicks on the track
         *
         * @private
         */
        clickOnTrackEvents: function () {
            var clickHandler = _.partial(function (instance, event) {
                var clickPosition, scrollDown, distance, newScrollY;

                // ignore clicks on the drag / make sure the event came form the track
                if (!instance.$scrollDom.trackY.is(event.target)) {
                    return;
                }

                // Find the click position, direction & distance on the track
                clickPosition = event.pageY - instance.$scrollDom.trackY.offset().top;
                scrollDown = clickPosition > instance.vars.dragYPosition;
                distance = instance.vars.viewportHeight;
                newScrollY = scrollDown ? instance.vars.scrollY + distance : instance.vars.scrollY - distance;

                // Do the scrolling
                instance.scrollTop(newScrollY);
            }, this);

            this.$scrollDom.trackY.on('click.custom-scrollbar', clickHandler);
        },

        /**
         * Create & append the scrollbar DOM & Populate DOM reference vars
         *
         * @private
         */
        prepareScrollDom: function () {
            var $topLevelScrollDom = this.getDom();

            this.$scrollDom = {
                container: $topLevelScrollDom,
                trackY: $topLevelScrollDom.find('.track-y'),
                dragY: $topLevelScrollDom.find('.track-y .drag')
            };

            this.updateDragHeight();

            this.$element.append(this.$scrollDom.container);
        },

        /**
         * Generate & return the DOM needed to create the custom scrollbar track & drag
         *
         * @return {element} The scrollbar DOM
         *
         * @private
         */
        getDom: function () {
            var str = [
                '<div class="custom-scroll-container">',
                    '<div class="track track-y"><div class="drag"></div></div>',
                '</div>'
            ].join('');

            return $(str);
        },

        /**
         * Set the drag bar css height
         *
         * @private
         */
        updateDragHeight: function () {
            this.$scrollDom.dragY.height(this.calcDragHeight());
        },

        /**
         * Calculate and return the height for the track bar
         *
         * @private
         *
         * @return {integer} The calculated height
         */
        calcDragHeight: function () {
            return Math.min(Math.floor(this.vars.viewportHeight / this.vars.scrollYMagnitude), this.vars.viewportHeight);
        },

        /**
         * Calculate & set the css position of the drag bar
         *
         * @private
         */
        updateDragPosition: function () {
            this.vars.dragYPosition = this.vars.scrollY / this.vars.scrollYMagnitude;

            this.$scrollDom.dragY.css({
                top: Math.floor(this.vars.dragYPosition) + 'px'
            });
        },

        /**
         * Handler for the scroll events from the scrolled element
         *
         * @private
         */
        scrollEventHandler: function (instance) {
            instance.setVars({
                scrollY: this.scrollTop
            });
        },

        /**
         * Changes handler
         *
         * @private
         */
        varsChangesHandler: function (changed) {
            if (changed.hasOwnProperty('scrollY')) {
                this.updateDragPosition();

                if (_.isFunction(this.onScrollCallback)) {
                    this.onScrollCallback.apply(null, [this.vars.scrollY, this.vars.contentHeight, this.vars.viewportHeight]);
                }
            }

            if (changed.hasOwnProperty('viewportHeight') || changed.hasOwnProperty('contentHeight')) {
                this.updateDragHeight();
                this.updateDragPosition();
            }

            if (changed.hasOwnProperty('scrollingY')) {
                if (changed.scrollingY) {
                    this.$element.addClass('scrollingY');
                } else {
                    this.$element.removeClass('scrollingY');
                }
            }

            if (changed.hasOwnProperty('overflowY')) {
                this.$element.toggleClass('no-overflow-y', !changed.overflowY);
            }
        }
    };

    return CustomScrollbar;
}));
