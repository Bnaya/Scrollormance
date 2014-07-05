## Scrollormance: Custom scrollbar for performance

The goal is to give the developer the ability to custom the scrollbar with css as any dom element, while maintaining the browser's builtin scroll mechanism

Demo: http://bnaya.github.io/Scrollormance/demo/

Its not yet supports horizontal scrollbar, although most of the code is there.

It can be used as global constructor or AMD module.

Depends on jquery and underscore,
jquery-mousewheel is a soft dependency, you need it to be available if you want the mousewheel will work when the mouse hovering the scrollbar.

Tested on IE8+, chrome, FF, opera, safari.

Each one of the jquery plugins/helpers for custom scrollbars i came across had drawback.
especially with dynamic content or the viewport/layout can be changed.

The scrolling itself is made by negative CSS top/margin-top values,
wich is not very performance(recalc css & layouts) and not hardware accelerated
or using css transform which is hardware accelerated but not supported on older browsers and not very optimized for updating context/layout size.

So what we will do here is to keep the overflow:auto but hide the native scrollbars,
(Actually if you just want scrolling and you don't need visual scrollbar you can just use that CSS)

The second part is the scrollbar itself, the JS class.
Its not changing the existing DOM, just adding the needed DOM for the visual scrollbar itself.

You need to create an instance of the class, giving the wanted DOM element. he must have the hiddenScrollbarViewport class

You can apply the helper also when the elements are off the DOM tree or when its display: none. (aka not in the render tree)

If you already know the initial values for

            viewportHeight,
            viewportWidth,
            contentHeight,
            contentWidth

you also can supply them, if you don't, just call .update()/updateLazy() afer you've appended the element to dom/when is not display: none; (aka when you add it to the render tree)

The update/updateLazy methods are to tell the class that one of the geometric values have changed and its need to recalculate the size and position of the scrollbar.

The updateLazy method queries the dom for the required geometric information,
while update method gives the developer the ability to supply them himself.
That can save the forced reflow/layout when reading layout related dom properties
