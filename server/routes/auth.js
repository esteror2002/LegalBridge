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

module.exports = router;
