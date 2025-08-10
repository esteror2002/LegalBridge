const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/approve/:token', authController.approveToken);
router.get('/pending-users', authController.getPendingUsers);
router.post('/approve-user/:id', authController.approveUserById);
router.delete('/delete-user/:id', authController.deleteUserById);
router.get('/clients', authController.getApprovedClients);
router.put('/update-profile', authController.updateProfile);
router.get('/get-profile/:username', authController.getProfile);
router.get('/2fa/status/:username', authController.get2FAStatus);
router.post('/2fa/setup/:username', authController.setup2FA);
router.post('/2fa/enable/:username', authController.enable2FA);
router.post('/2fa/sms/send/:username', authController.sendSmsCode);
router.post('/2fa/sms/verify/:username', authController.verifySmsCode);


module.exports = router;
