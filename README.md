# react-responsive-block
ELQ React Component

A component that wraps components in order to enable them to be responsive by its width. This is a React-specific high level API of ELQ. This component assumes that all parent elements that have `display:none` are `block`-elemens.

##### Example of sizeBreakpoints:

The width size breakpoints of interest, that defines the size state of the wrapped component. It is required to have at least a size breakpoint of 0.

```
 {
    small: 0,
    medium: 500,
    large: 700
 }
```

This can be interpreted as "size is small from 0 to 500, medium from 500 to 700 and large above 700".

##### Example usage

```js
import responsiveBlockMaker from 'react-responsive-block/responsiveBlock';

// Get your ELQ instance from somewhere (or create it here if you wish).
var elq = ...;

var ResponsiveBlock = responsiveBlockMaker({elq});

// This is the responsive component that we want to create.
var MyComponentInternal = function (props) {
    // Here goes all advanced breakpoint logic for the view.

    if (props.size === 'small') {
        return <p>Small size</p>;
    }

    if (props.size === 'medium') {
        return <p>Medium size</p>;
    }

    if (props.size === 'large') {
        return <p>Large size</p>;
    }
};

// Create a wrapper component that wraps your
// "real" component with a Responsive Block.
var MyComponent = function (props) {
    const sizeBreakpoints = {
        small: 0,
        medium: 500,
        large: 700
    };

    return (
        <ResponsiveBlock sizeBreakpoints={sizeBreakpoints}>
            <MyComponentInternal {...props} />
        </ResponsiveBlock>
    );
};
```