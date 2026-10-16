import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse';

// General rate limiter — applies to all routes
// 100 requests per 15 minutes per IP address
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        sendError({
        res,
        statusCode: 429,
        message: 'Too many requests. Please try again in 15 minutes.',
        });
    },
});

// Strict rate limiter — applies to sensitive auth routes
// 10 requests per 15 minutes per IP address
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        sendError({
        res,
        statusCode: 429,
        message: 'Too many attempts. Please try again in 15 minutes.',
        });
    },
    });

// Applied after authentication and only when a profile photo is changed.
export const profilePhotoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: req => req.user!.id,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        sendError({ res, statusCode: 429, message: 'Too many photo changes. Please try again in an hour.' });
    },
});

// Donation rate limiter — applies to payment routes
// 20 requests per hour per IP address
export const donationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        sendError({
        res,
        statusCode: 429,
        message: 'Too many donation attempts. Please try again in an hour.',
        });
    },
});
