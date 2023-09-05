odoo.define('boost_pos_order_sync.ListOrderReceivedScreen', function (require) {
    "use strict";

    var { Order, Orderline } = require('point_of_sale.models');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class ListOrderReceivedScreen extends PosComponent {

        back() {
            this.trigger('close-temp-screen');
        }

        _clickOrderReceived(event) {
            var self = this;
            let quotes = self.env.pos.all_quotes;
            let quote_id = event.srcElement.parentElement.getAttribute("data-quote_id");
            let quote_dict = quotes.filter((e) => e.quote_id === quote_id);
            let all_pos_orders = self.env.pos.get_order_list() || [];
            let already_loaded = false;

            already_loaded = _.find(all_pos_orders, function (pos_order) {
                if (pos_order.quote_name && pos_order.quote_name === quote_id)
                    return pos_order;
            });

            if (already_loaded) {
                self.showPopup('MessagePopup', {
                    title: self.env._t('Quotation is already loaded & in progress'),
                    body: self.env._t('This quotation is already in progress. Please proceed with Order Reference')
                });
            } else {
                self.set_order(quote_dict[0]);
                setTimeout(function () {
                    $(".button.back").click();
                }, 100);
            }
        }

        set_order(quote_dict, table) {
            var self = this;

            let new_order = self.env.pos.add_new_order();

            if (table) {
                new_order.table = table;
            }

            let partner_id = quote_dict.partner_id[0];
            if (partner_id) {
                let new_client = self.env.pos.db.get_partner_by_id(quote_dict.partner_id[0]);
                if (new_client) {
                    new_order.set_partner(new_client);
                } else {
                    self.env.pos.load_new_partners().then(function () {
                        new_client = self.env.pos.db.get_partner_by_id(quote_dict.partner_id[0]);
                        new_order.set_partner(new_client);
                    });
                }
            }

            self.set_orderliness(new_order, quote_dict);
            return new_order
        }

        set_orderliness(new_order, quote_dict) {
            var self = this;

            quote_dict.line.forEach(function (line) {
                let orderline = Orderline.create({}, {
                    pos: self.env.pos,
                    order: new_order,
                    product: self.env.pos.db.get_product_by_id(line.product_id),
                });

                orderline.set_unit_price(line.price_unit);
                orderline.set_discount(line.discount);
                orderline.set_quantity(line.qty, 'set line price');

                new_order.add_orderline(orderline);
            });

            new_order.set_quote(quote_dict);
            new_order.export_as_JSON();
            new_order.save_to_db();

            self.showPopup('ConfirmNotifyPopup', {
                'title': self.env._t('Quote Loaded')
            });

        }
    }

    ListOrderReceivedScreen.template = 'ListOrderReceivedScreen';
    Registries.Component.add(ListOrderReceivedScreen);
    return ListOrderReceivedScreen;
})