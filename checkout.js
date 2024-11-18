const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
 key_id: process.env.RAZORPAY_KEY_ID,
 key_secret: process.env.RAZORPAY_KEY_SECRET,
});
router.post('/create-checkout-session', async (req, res) => {
 try {
 const items = req.body.items;
 const totalAmount = items.reduce((total, item) => total + item.amount
* item.quantity, 0);
 const orderOptions = {
 amount: totalAmount * 100, // Amount in paise
 currency: 'INR',
 receipt: `order_rcptid_${Math.floor(Math.random() * 1000000000)}`,
 payment_capture: 1,
 };
 const order = await razorpay.orders.create(orderOptions);
 res.json({ id: order.id });
 } catch (error) {
 console.error(error);
 res.status(500).send('An error occurred during checkout');
 }
});
module.exports = router;