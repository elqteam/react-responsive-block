import React from 'react';
import ReactDOM from 'react-dom';

function areEqualShallow(a, b) {
    for(var key in a) {
        if(!(key in b) || a[key] !== b[key]) {
            return false;
        }
    }
    for(var key in b) {
        if(!(key in a) || a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}

export default function (options) {
    var elq = options.elq;

    if (!elq) {
        throw new Error('ResponsiveBlock: ELQ is required.');
    }

    return React.createClass({
        getDefaultProps: function () {
            return {
                sizeBreakpoints: {}
            };
        },
        getInitialState: function () {
            this.validateBreakpoints(this.props.sizeBreakpoints);

            return {
                size: null
            };
        },
        componentWillReceiveProps: function (nextProps) {
            if (areEqualShallow(this.props.sizeBreakpoints, nextProps.sizeBreakpoints)) {
                return;
            }

            // If the sizeBreakpoints have changed, we want to re-initialize ELQ with the new breakpoints.
            this.validateBreakpoints(nextProps.sizeBreakpoints);
            elq.deactivate(this.refs.container);
            this.attachBreakpointStatesChangedHandler();
            elq.activate(this.refs.container);
        },
        render: function () {
            // Since ELQ cannot be started before the first render, there will be no state.size until shortly after (when the second render is triggered).
            // Delay the rendering of the content until there is a size.
            var content;
            if (this.state.size) {
                content = React.Children.map(this.props.children, function (child) {
                    return React.cloneElement(child, {
                        size: this.state.size
                    });
                }, this);
            }

            var breakpoints = this.getBreakpoints().join(' ');

            return (
                <div className={this.props.className} ref="container" data-elq-breakpoints data-elq-breakpoints-widths={breakpoints}>
                    {content}
                    <div style={{position: 'absolute', visibility: 'hidden'}} ref="renderDetector"></div>
                </div>
            );
        },
        componentDidMount: function () {
            function isDetached(element) {
                function isInDocument(element) {
                    return element === element.ownerDocument.body || element.ownerDocument.body.contains(element);
                }
                return !isInDocument(element);
            }

            function isUnrendered(el) {
                return getComputedStyle(el).width.indexOf('px') === -1;
            }

            function ensureRendered(el, callback) {
                var alteredParents = [];

                var parent = el;
                while (parent = parent.parentElement) { // eslint-disable-line no-cond-assign
                    if (!isUnrendered(parent)) {
                        break;
                    }

                    if (getComputedStyle(parent).display === 'none') {
                        var styleDisplay = parent.style.display;
                        parent.style.display = 'block';
                        alteredParents.push({
                            el: parent,
                            styleDisplay: styleDisplay
                        });
                    }
                }

                if (isUnrendered(el)) {
                    console.warn('Invariant: Parents rendered but the element still has no width'); // eslint-disable-line no-console
                }

                callback();

                alteredParents.reverse().forEach(function (parent) {
                    var el = parent.el;
                    var styleDisplay = parent.styleDisplay || ''; // Default to empty string so that the value is removed from the inline style. Null is not accepted by IE.
                    el.style.display = styleDisplay;
                });
            }

            function ensureAttached(el, callback) {
                function raf(fn) {
                    if (window.requestAnimationFrame) {
                        window.requestAnimationFrame(fn);
                    } else {
                        setTimeout(fn, 16); // 60 fps
                    }
                }

                // Need to do this with polling :(
                function checkAttachment() {
                    if (isDetached(el)) {
                        raf(checkAttachment);
                    } else {
                        callback();
                    }
                }

                checkAttachment();
            }

            this.attachBreakpointStatesChangedHandler();

            var node = ReactDOM.findDOMNode(this);

            ensureAttached(node, function whileAttached() {
                ensureRendered(node, function whileRendered() {
                    elq.activate(this.refs.container);
                }.bind(this));
            }.bind(this));
        },
        componentWillUnmount: function () {
            elq.deactivate(this.refs.container);
        },
        validateBreakpoints: function (sizeBreakpoints) {
            var breakpoints = Object.keys(sizeBreakpoints).map(function (k) {
                return sizeBreakpoints[k];
            }, this);

            var foundStart = false;
            var sameUnit = true;
            var overallUnit;

            if (!breakpoints.length) {
                console.warn('ResponsiveBlock: There are no size breakpoints defined. If you do not need breakpoints, then use a <div> instead.'); // eslint-disable-line no-console
                return;
            }

            breakpoints.forEach(function (bp) {
                if (!bp) {
                    // Any falsy value is treated as start (since 0 is falsy).
                    foundStart = true;
                } else {
                    var unit = 'px';

                    if (bp.match) {
                        var parts = bp.match(/(\d*\.?\d*)(.*)/);
                        unit = parts[parts.length - 1];
                    }

                    if (!overallUnit) {
                        overallUnit = unit;
                    } else {
                        if (overallUnit !== unit) {
                            sameUnit = false;
                        }
                    }
                }
            });

            if (!foundStart) {
                throw new Error('ResponsiveBlock: You need to define a starting size breakpoint. For example, \"small: 0\". Given size breakpoints:', this.props.sizeBreakpoints);
            }

            if (!sameUnit) {
                throw new Error('ResponsiveBlock: All breakpoints need to have the same unit. Given size breakpoints:', this.props.sizeBreakpoints);
            }
        },
        getOrderedSizes: function () {
            var breakpoints = Object.keys(this.props.sizeBreakpoints).map(function (k) {
                var bp = parseInt(this.props.sizeBreakpoints[k] || 0, 10);
                var size = k;
                return {
                    size: size,
                    breakpoint: bp
                };
            }, this);

            breakpoints.sort(function (a, b) {
                return a.bp - b.bp;
            });

            return breakpoints.map(function (tuple) {
                return tuple.size;
            });
        },
        getBreakpoints: function () {
            return Object.keys(this.props.sizeBreakpoints).map(function (k) {
                return this.props.sizeBreakpoints[k] || 0;
            }, this);
        },
        attachBreakpointStatesChangedHandler: function () {
            var sizes = this.getOrderedSizes();

            elq.listenTo(this.refs.container, 'breakpointStatesChanged', function (e, breakpointStates) {
                var size = sizes[0];
                breakpointStates.width.forEach(function (state, index) {
                    if (state.over) {
                        size = sizes[index];
                    }
                }, this);

                this.setState({
                    size: size
                });
            }.bind(this));
        }
    });
}
