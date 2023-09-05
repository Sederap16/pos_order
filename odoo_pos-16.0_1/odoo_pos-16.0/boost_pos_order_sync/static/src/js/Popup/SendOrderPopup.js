odoo.define('boost_pos_order_sync.SendOrderPopup', function (require) {
    "use strict";

    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    var core = require('web.core');
    var QWeb = core.qweb;

    class SendOrderPopup extends AbstractAwaitablePopup {

        setup() {
            super.setup();
            this.selected_session_id = null;
        }

        click_select_session(session_id) {
            this.selected_session_id = session_id;
            $('.select_session').css('background', '#FFFFFF');
            $("span.select_session[id=" + session_id + " ]").css('background', 'rgb(84 222 100)');
        }

        send_and_print_order_quote() {
            var self = this;
            self.send_order_quote(true);
            if (self.selected_session_id) {
                if (self.env.pos.config.quotation_print_type == 'pdf') {
                    setTimeout(function () {
                        self.env.legacyActionManager.do_action('boost_pos_order_sync.report_quote', {
                            additional_context: {
                                active_ids: [self.env.pos.get_order().created_quote_id],
                            }
                        });
                    }, 1000)
                }
                // Review this functionality later priority 2 //
                /*
                else if (self.env.pos.config.quotation_print_type == 'posbox') {
                    var order = self.env.pos.get_order();
                    var to_session = _.filter(self.env.pos.other_active_session, function (session) {
                        return (session.id == self.to_session_id)
                    });
                    var quote = {
                        'quote_id': $("#quote_id").text(),
                        'from_session': self.env.pos.pos_session.config_id[1],
                    }
                    if (to_session)
                        quote['to_session'] = to_session[0].config_id[1];
                    var result = {
                        widget: self.env,
                        pos: self.env.pos,
                        order: order,
                        receipt: order.export_for_printing(),
                        orderlines: order.get_orderlines(),
                        paymentlines: order.get_paymentlines(),
                        quote: quote,
                    }
                    var receipt = QWeb.render('OrderSyncOrderReceipt', result);
                    self.env.pos.proxy.printer.print_receipt(receipt);
                }
                */
            }
        }

        send_order_quote(print_order_quote) {
            var self = this;
            var session_id = self.selected_session_id;

            if (session_id) {
                if ($("#quote_id").text() == '') {
                    self.showPopup('ErrorPopup', {
                        title: self.env._t('Error ID'),
                        body: self.env._t('No quote ID found'),
                    });
                } else {
                    self.rpc({
                        model: 'pos.quote',
                        method: 'search_quote',
                        args: [{ 'quotation_id': $("#quote_id").text() }],
                    }).then(function (result) {
                        if (result) {
                            self.showPopup('ErrorPopup', {
                                title: self.env._t('Error Quote'),
                                body: self.env._t('This quote ID has already been used'),
                            });
                        } else {
                            self.rpc({
                                model: 'pos.quote',
                                method: 'create',
                                args: [self.fill_order_quote(session_id)],
                            }).then(function (new_quote_id) {
                                if (print_order_quote === true)
                                    self.env.pos.get_order().created_quote_id = new_quote_id;
                                self.showPopup('ConfirmNotifyPopup');
                                self.cancel();
                            }).catch(function () {
                                self.showPopup('ErrorPopup', {
                                    title: self.env._t('Error Network'),
                                    body: self.env._t('Please make sure you are connected to the network')
                                });
                            })
                        }
                    }).catch(function () {
                        self.showPopup('ErrorPopup', {
                            title: self.env._t('Error Network'),
                            body: self.env._t('Please make sure you are connected to the network')
                        });
                    })
                }
            } else {
                $(".select_session").css("background-color", "#F18787");
                setTimeout(function () {
                    $(".select_session").css("background-color", "");
                }, 100);
                setTimeout(function () {
                    $(".select_session").css("background-color", "#F18787");
                }, 200);
                setTimeout(function () {
                    $(".select_session").css("background-color", "");
                }, 300);
                setTimeout(function () {
                    $(".select_session").css("background-color", "#F18787");
                }, 400);
                setTimeout(function () {
                    $(".select_session").css("background-color", "");
                }, 500);
            }
        }

        fill_order_quote(session_id) {
            var self = this;
            let current_order = self.env.pos.get_order();
            let order_vals = {};
            
            order_vals.to_session_id = session_id;
            self.to_session_id = session_id;
            order_vals.date_order = moment(current_order.creation_date).format("YYYY-MM-DD HH:mm:ss");
            order_vals.user_id = self.env.pos.user.id ? self.env.pos.user.id : 2;
            if (current_order.get_partner()) {
                order_vals.partner_id = current_order.get_partner().id
            }
            order_vals.session_id = self.env.pos.pos_session.id;
            order_vals.pricelist_id = current_order.pricelist.id;
            order_vals.note = $("#quote_note").val();
            order_vals.quote_id = $("#quote_id").text();
            order_vals.amount_total = current_order.get_total_with_tax();
            order_vals.amount_tax = current_order.get_total_tax();

            order_vals.lines = [];
            var orderlines = self.env.pos.get_order().get_orderlines();

            orderlines.forEach(function (orderline) {
                var order_line_vals = {};
                order_line_vals.product_id = orderline.product.id;
                order_line_vals.price_unit = orderline.get_unit_display_price();
                order_line_vals.qty = orderline.quantity;
                order_line_vals.discount = orderline.discount;
                order_line_vals.price_subtotal = orderline.get_price_without_tax();
                order_line_vals.price_subtotal_incl = orderline.get_price_with_tax();
                if (orderline.get_unit()){
                    order_line_vals.product_uom = orderline.get_unit().id;
                }
                var tax_ids = [];
                orderline.product.taxes_id.forEach(function (tax_id) {
                    tax_ids.push(tax_id);
                });
                order_line_vals.quote_tax_ids = tax_ids;
                order_vals.lines.push([0, 0, order_line_vals]);
            });
            return order_vals;
        }
    }

    SendOrderPopup.template = 'SendOrderPopup';
    Registries.Component.add(SendOrderPopup);
    return SendOrderPopup;
});