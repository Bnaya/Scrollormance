# Scrollormance: Custom scrollbar for performance

Check the demo: http://bnaya.github.io/Scrollormance/demo/

Note that this is an initial but working version.
Its not yet support vertical scrollbar, although most of the code is there

Its on AMD format, depends on Backbone (For its model), underscore, jquery and jquery mousewheel

It was tested on IE8+, chrome, FF, opera, safari.

All of the jquery plugins for custom scrollbars i came across were lame for many reasons,
especially when the size of the content or the viewport needs to be changed.

Also the scrolling itself is made by negative CSS top/margin-top values,
which is bad for performance.

So what we will do is to keep the overflow:auto but hide the native scrollbars,
Actually if you just want scrolling and you don't need scrollbar (the native is ugly) you can just use that CSS.

The second part is the scrollbar itself, the JS class.
Note that its not changing the existing DOM, its just adding the needed DOM for the scrollbar.

You need to create an instance of the class, suppling the wanted DOM element (Note that he must be ".hiddenScrollbarViewport" element)
You can apply this also when the elements are off the DOM tree or when its display: none

If you already know the initial values for

            viewportHeight,
            viewportWidth,
            contentHeight,
            contentWidth

you also can supply them, if you don't just pass 0, but don't forget the call .update()/updateLazy()

The update/updateLazy methods are to tell the class that one of the geometric values have changed and its need to recalculate the size and position of the scrollbar.

updateLazy and performance(just update).

On the performance, the JS code dose not query the DOM for any geometric values so you will need to provide them
(After calculating them in JS code, and not querying the DOM for them ofc :P)
