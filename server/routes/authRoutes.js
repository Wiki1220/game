const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/guest', authController.guestLogin);

// 需要认证的路由
router.get('/me', authenticateToken, authController.getMe);
router.post('/convert', authenticateToken, authController.convertGuest);

module.exports = router;
