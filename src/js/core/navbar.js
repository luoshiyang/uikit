import { Class } from '../mixin/index';
import { $, addClass, assign, within, height, isRtl, isVisible, noop, query, toFloat, Transition } from '../util/index';

export default function (UIkit) {

    UIkit.component('navbar', {

        mixins: [Class],

        props: {
            dropdown: String,
            mode: 'list',
            align: String,
            offset: Number,
            boundary: Boolean,
            boundaryAlign: Boolean,
            clsDrop: String,
            delayShow: Number,
            delayHide: Number,
            dropbar: Boolean,
            dropbarMode: String,
            dropbarAnchor: 'jQuery',
            duration: Number
        },

        defaults: {
            dropdown: '.uk-navbar-nav > li',
            align: !isRtl ? 'left' : 'right',
            clsDrop: 'uk-navbar-dropdown',
            mode: undefined,
            offset: undefined,
            delayShow: undefined,
            delayHide: undefined,
            boundaryAlign: undefined,
            flip: 'x',
            boundary: true,
            dropbar: false,
            dropbarMode: 'slide',
            dropbarAnchor: false,
            duration: 200,
        },

        computed: {

            boundary() {
                return (this.$props.boundary === true || this.boundaryAlign) ? this.$el : this.$props.boundary
            },

            pos() {
                return `bottom-${this.align}`;
            }

        },

        ready() {

            if (this.dropbar) {
                UIkit.navbarDropbar(
                    query(this.dropbar, this.$el) || $('<div></div>').insertAfter(this.dropbarAnchor || this.$el),
                    {clsDrop: this.clsDrop, mode: this.dropbarMode, duration: this.duration, navbar: this}
                );
            }

        },

        update() {

            UIkit.drop(
                $(`${this.dropdown} .${this.clsDrop}`, this.$el).filter((_, el) => !UIkit.getComponent(el, 'dropdown')),
                assign({}, this.$props, {boundary: this.boundary, pos: this.pos})
            );

        },

        events: [

            {
                name: 'mouseover',

                delegate() {
                    return this.dropdown;
                },

                handler({current}) {
                    var active = this.getActive();
                    if (active && active.toggle && !within(active.toggle.$el, current) && !active.tracker.movesTo(active.$el)) {
                        active.hide(false);
                    }
                }

            }

        ],

        methods: {

            getActive() {
                var active = UIkit.drop.getActive();
                return active && ~active.mode.indexOf('hover') && within(active.toggle.$el, this.$el) && active;
            }

        }

    });

    UIkit.component('navbar-dropbar', {

        mixins: [Class],

        defaults: {
            clsDrop: '',
            mode: 'slide',
            navbar: null,
            duration: 200
        },

        init() {

            if (this.mode === 'slide') {
                addClass(this.$el, 'uk-navbar-dropbar-slide');
            }

        },

        events: [

            {
                name: 'beforeshow',

                el() {
                    return this.navbar.$el;
                },

                handler(e, drop) {
                    var {$el, dir} = drop;
                    if (dir === 'bottom' && !within($el, this.$el)) {
                        $el.appendTo(this.$el);
                        drop.show();
                        e.preventDefault();
                    }
                }
            },

            {
                name: 'mouseleave',

                handler() {
                    var active = this.navbar.getActive();

                    if (active && !this.$el.is(':hover')) {
                        active.hide();
                    }
                }
            },

            {
                name: 'beforeshow',

                handler(_, {$el}) {
                    this.clsDrop && addClass($el, `${this.clsDrop}-dropbar`);
                    this.transitionTo(height($el[0]) + toFloat($el.css('marginTop')) + toFloat($el.css('marginBottom')));
                }
            },

            {
                name: 'beforehide',

                handler(e, {$el}) {

                    var active = this.navbar.getActive();

                    if (this.$el.is(':hover') && active && active.$el.is($el)) {
                        e.preventDefault();
                    }
                }
            },

            {
                name: 'hide',

                handler(_, {$el}) {

                    var active = this.navbar.getActive();

                    if (!active || active && active.$el.is($el)) {
                        this.transitionTo(0);
                    }
                }
            }

        ],

        methods: {

            transitionTo(newHeight) {
                height(this.$el, isVisible(this.$el) ? height(this.$el) : 0);
                Transition.cancel(this.$el);
                return Transition.start(this.$el, {height: newHeight}, this.duration).then(null, noop);
            }

        }

    });

}
