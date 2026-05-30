import { Resend } from 'resend';
import { env } from '../config/env';
import logger from '../utils/logger';

const resend = new Resend(env.resendApiKey);

const FROM = env.resendFromEmail;
const APP_NAME = 'GivHive';
const DASHBOARD_URL = env.clientUrl;

export class EmailService {
  // ── Donor Welcome ──────────────────────────────────────────────────────────
  async sendDonorWelcome(to: string, firstName: string) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `Welcome to GivHive, ${firstName}! 👋`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
          </div>
          <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1A1A1A;">Welcome to GivHive, ${firstName}! 🎉</h2>
            <p style="color: #4A4A4A; line-height: 1.6;">
              You have joined a community of donors making a real difference in Winnipeg and beyond.
              Every donation and food pledge you make goes directly to verified NGOs helping people in need.
            </p>
            <div style="background: #E8F5EE; border-radius: 8px; padding: 20px; margin: 16px 0;">
              <p style="margin: 0; font-weight: bold; color: #1A1A1A;">Here is what you can do:</p>
              <p style="margin: 8px 0 0 0; color: #4A4A4A; line-height: 1.8;">
                ❤️ Make cash donations to verified NGOs<br>
                📦 Pledge food items to specific needs<br>
                📰 Follow NGO updates and impact stories<br>
                🔔 Get notified when your pledges are confirmed
              </p>
            </div>
            <a href="https://givhive.com" 
              style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; 
              border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              Start giving →
            </a>
            <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
            <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
          </div>
        </div>
      `,
      });
      logger.info(`Email sent: Donor welcome — ${to}`);
    } catch (error) {
      logger.error('Failed to send donor welcome email', { error, to });
    }
  }

  // ── NGO Application Received ───────────────────────────────────────────────
  async sendNGOApplicationReceived(to: string, ngoName: string) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `We received your GivHive application — ${ngoName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
          </div>
          <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1A1A1A;">Application received! 📋</h2>
            <p style="color: #4A4A4A; line-height: 1.6;">
              Thank you for applying to join GivHive. We have received your application for 
              <strong>${ngoName}</strong> and our team will review it shortly.
            </p>
            <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #92400E; font-weight: bold;">What happens next?</p>
              <p style="margin: 8px 0 0 0; color: #92400E; line-height: 1.8;">
                1. Our team reviews your application<br>
                2. We may reach out if we need more information<br>
                3. You will receive an email once a decision is made<br>
                4. If approved, your NGO goes live on GivHive immediately
              </p>
            </div>
            <p style="color: #4A4A4A; line-height: 1.6;">
              You can check your application status at any time by logging into your dashboard.
            </p>
            <a href="https://givhive.com/ngo/profile" 
              style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; 
              border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              View application status →
            </a>
            <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
            <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
          </div>
        </div>
      `,
      });
      logger.info(`Email sent: NGO application received — ${to}`);
    } catch (error) {
      logger.error('Failed to send NGO application received email', {
        error,
        to,
      });
    }
  }

  // ── NGO Approved ───────────────────────────────────────────────────────────
  async sendNGOApproved(to: string, ngoName: string) {
    try {
      logger.info(
        `Attempting to send NGO approved email to: ${to} for NGO: ${ngoName}`
      );
      const result = await resend.emails.send({
        from: FROM,
        to,
        subject: `🎉 ${ngoName} is now live on GivHive`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">Your NGO is approved! 🎉</h2>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Great news — <strong>${ngoName}</strong> has been verified and is now live on the GivHive platform.
                Donors can now find your organisation, make cash donations, and pledge food items to your needs.
              </p>
              <a href="${DASHBOARD_URL}/ngo" 
                style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; 
                border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Go to your dashboard →
              </a>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Next steps:
                <br>• Post your first food need
                <br>• Write an update to introduce your organisation to donors
                <br>• Invite your team members
              </p>
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent successfully: NGO approved — ${to}`);
    } catch (error) {
      logger.error('Failed to send NGO approved email', { error, to });
    }
  }

  // ── NGO Rejected ───────────────────────────────────────────────────────────
  async sendNGORejected(to: string, ngoName: string, reason: string) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `Update on your GivHive application — ${ngoName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">Application update for ${ngoName}</h2>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Thank you for applying to join GivHive. After reviewing your application, 
                we were unable to approve it at this time.
              </p>
              <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; border-radius: 4px; margin: 16px 0;">
                <p style="color: #DC2626; margin: 0; font-weight: bold;">Reason:</p>
                <p style="color: #DC2626; margin: 8px 0 0 0;">${reason}</p>
              </div>
              <p style="color: #4A4A4A; line-height: 1.6;">
                You can update your application and resubmit. You have up to 3 resubmission attempts.
              </p>
              <a href="${DASHBOARD_URL}/ngo/profile" 
                style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; 
                border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Update and resubmit →
              </a>
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent: NGO rejected — ${to}`);
    } catch (error) {
      logger.error('Failed to send NGO rejected email', { error, to });
    }
  }

  // ── NGO Team Member Invited ────────────────────────────────────────────────
  async sendNGOMemberInvite(to: string, ngoName: string, inviterName: string) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `You have been invited to join ${ngoName} on GivHive`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">You have been invited!</h2>
              <p style="color: #4A4A4A; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>${ngoName}</strong> 
                as a team member on GivHive.
              </p>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Sign in to your GivHive account to accept the invitation and start managing 
                food needs, pledges, and updates for ${ngoName}.
              </p>
              <a href="${DASHBOARD_URL}/login" 
                style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; 
                border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Sign in to GivHive →
              </a>
              <p style="color: #9CA3AF; font-size: 13px;">
                Don't have an account yet? 
                <a href="${DASHBOARD_URL}/register" style="color: #1A7A4A;">Create one here</a>
              </p>
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent: NGO member invite — ${to}`);
    } catch (error) {
      logger.error('Failed to send NGO member invite email', { error, to });
    }
  }

  // ── Admin Team Member Invited ──────────────────────────────────────────────
  async sendAdminInvite(to: string, inviterName: string) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `You have been invited to join the GivHive admin team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">Welcome to the GivHive admin team</h2>
                            <p style="color: #4A4A4A; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join the GivHive admin team.
                Review the invitation and choose whether to accept — you'll only gain admin
                access once you accept.
              </p>
              <a href="${DASHBOARD_URL}/accept-invite" 
                style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; 
                border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Review your invitation →
              </a>

              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent: Admin invite — ${to}`);
    } catch (error) {
      logger.error('Failed to send admin invite email', { error, to });
    }
  }

  // ── Donation Receipt ───────────────────────────────────────────────────────
  async sendDonationReceipt(
    to: string,
    donorName: string,
    ngoName: string,
    amount: number,
    currency: string
  ) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `Thank you for your donation to ${ngoName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">Thank you, ${donorName}! ❤️</h2>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Your donation has been processed successfully.
              </p>
              <div style="background: #E8F5EE; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <p style="margin: 0; color: #4A4A4A;">Donated to</p>
                <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #1A1A1A;">${ngoName}</p>
                <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #1A7A4A;">
                  $${amount.toFixed(2)} ${currency}
                </p>
              </div>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Your generosity makes a real difference in the Winnipeg community. 
                Thank you for choosing to give through GivHive.
              </p>
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent: Donation receipt — ${to}`);
    } catch (error) {
      logger.error('Failed to send donation receipt email', { error, to });
    }
  }

  // ── Pledge Confirmed ───────────────────────────────────────────────────────
  async sendPledgeConfirmed(
    to: string,
    donorName: string,
    ngoName: string,
    itemName: string,
    quantity: number,
    unit: string
  ) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `Your food pledge has been confirmed by ${ngoName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">Pledge confirmed! 📦</h2>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Hi ${donorName}, your food pledge has been confirmed by <strong>${ngoName}</strong>.
              </p>
              <div style="background: #E8F5EE; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <p style="margin: 0; color: #4A4A4A;">Your pledge</p>
                <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #1A1A1A;">
                  ${quantity} ${unit} of ${itemName}
                </p>
                <p style="margin: 4px 0 0 0; color: #4A4A4A;">to ${ngoName}</p>
              </div>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Please drop off your items at the confirmed location. 
                The NGO team will mark your pledge as fulfilled once they receive the items.
              </p>
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent: Pledge confirmed — ${to}`);
    } catch (error) {
      logger.error('Failed to send pledge confirmed email', { error, to });
    }
  }

  // ── Pledge Fulfilled ───────────────────────────────────────────────────────
  async sendPledgeFulfilled(
    to: string,
    donorName: string,
    ngoName: string,
    itemName: string,
    quantity: number,
    unit: string
  ) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject: `Your food pledge has been fulfilled — thank you!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A7A4A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GivHive</h1>
            </div>
            <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1A1A1A;">Pledge fulfilled! 🌱</h2>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Hi ${donorName}, <strong>${ngoName}</strong> has confirmed receipt of your food pledge. 
                Your contribution has made a real difference!
              </p>
              <div style="background: #E8F5EE; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <p style="margin: 0; color: #1A7A4A; font-weight: bold;">✅ Fulfilled</p>
                <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #1A1A1A;">
                  ${quantity} ${unit} of ${itemName}
                </p>
                <p style="margin: 4px 0 0 0; color: #4A4A4A;">delivered to ${ngoName}</p>
              </div>
              <p style="color: #4A4A4A; line-height: 1.6;">
                Thank you for your generosity. Every item you donate helps feed families 
                in the Winnipeg community.
              </p>
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">GivHive — Winnipeg, Canada</p>
            </div>
          </div>
        `,
      });
      logger.info(`Email sent: Pledge fulfilled — ${to}`);
    } catch (error) {
      logger.error('Failed to send pledge fulfilled email', { error, to });
    }
  }
}

export default new EmailService();
