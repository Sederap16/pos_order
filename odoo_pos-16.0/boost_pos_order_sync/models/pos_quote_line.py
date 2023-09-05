from odoo import api, fields, models


class PosQuoteLine(models.Model):
    _name = 'pos.quote.line'
    _description = 'POS quotes lines'

    name = fields.Char(
        string='Line',
        default='Quote Line'
    )
    quote_id = fields.Many2one(
        comodel_name='pos.quote',
        string='Quote'
    )
    product_id = fields.Many2one(
        comodel_name='product.product',
        string='Product',
        domain=[('sale_ok', '=', True), ('available_in_pos', '=', True)],
        required=True,
        change_default=True
    )
    price_unit = fields.Float(
        string='Unit price',
        digits=0
    )
    qty = fields.Float(
        string='Quantity'
    )
    price_subtotal = fields.Float(
        string='Subtotal w/o tax',
        digits=0
    )
    price_subtotal_incl = fields.Float(
        string='Subtotal',
        digits=0
    )
    discount = fields.Float(
        string='Discount (%)',
        digits=0
    )
    tax_ids = fields.Many2many(
        comodel_name='account.tax',
        string='Taxes'
    )
    #notice = fields.Char(
    #    string='Discount notice'
    #)
    product_uom = fields.Many2one(
        comodel_name='uom.uom',
        string='Unit of measure'
    )

    @staticmethod
    def get_quote_line_fields_from_ui():
        return ['product_id', 'price_unit', 'qty', 'discount', 'price_subtotal', 'price_subtotal_incl', 'tax_ids', 'quote_id', 'product_uom']

    def clean_fields_creation(self, order_lines):
        list_lines = []
        for order_line in order_lines:
            ui_fields = self.get_quote_line_fields_from_ui()
            new_order_line = {}
            for field in ui_fields:
                new_order_line[field] = order_line.get(field)
            list_lines.append(new_order_line)
        return list_lines

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if 'quote_tax_ids' in vals:
                tax_ids_list = vals['quote_tax_ids']
                vals['tax_ids'] = [(6, 0, tax_ids_list)]
                del vals['quote_tax_ids']
        vals_list = self.clean_fields_creation(vals_list)
        record = super(PosQuoteLine, self).create(vals_list)
        return record

    def get_order_line_dict_data(self):
        order_line = {
            'product_id': self.product_id.id,
            'price_unit': self.price_unit,
            'qty': self.qty,
            'discount': self.discount,
            'product_uom': self.product_uom.id
        }
        return order_line