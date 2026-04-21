import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const defaultFrom = `"${process.env.EMAIL_FROM_NAME || "6ure"}" <${process.env.EMAIL_FROM || "contact@6ureleaks.com"}>`;

export interface EmailUser {
  email: string;
  username: string;
}

export interface EmailSubscription {
  planName: string;
  interval: string;
  amount?: string;
  currency?: string;
}

export async function sendSubscriptionActivatedEmail(user: EmailUser, sub: EmailSubscription) {
  if (!user.email) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #333;">
      <h2 style="color: #5865f2;">Welcome to ${sub.planName}!</h2>
      <p>Hi ${user.username},</p>
      <p>Your subscription for <strong>${sub.planName} (${sub.interval})</strong> has been successfully activated.</p>
      ${sub.amount && sub.currency ? `<p>Amount: $${sub.amount} ${sub.currency}</p>` : ''}
      <p>Your Discord role should be assigned automatically. If you don't have it yet, you can force a sync from your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/requests/account">Account Dashboard</a>.</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 13px; color: #666;">
        <strong>Refund Policy:</strong> We will only accept refunds if the subscription is unused. 'Unused' means you haven't used any of the perks like downloading presets after getting premium, or making a request. The refund automatically becomes ineligible once any perk has been used. For Leak Protection, we do not offer refunds at all unless allowed on behalf of the owner.
      </p>
      <p style="font-size: 13px; color: #666;">Thanks for your support!<br>The 6ure Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: defaultFrom,
    to: user.email,
    subject: `Your ${sub.planName} subscription is active!`,
    html,
  });
}

export async function sendPaymentFailedEmail(user: EmailUser, sub: EmailSubscription) {
  if (!user.email) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #333;">
      <h2 style="color: #faa61a;">Action Required: Payment Failed</h2>
      <p>Hi ${user.username},</p>
      <p>We couldn't process the renewal payment for your <strong>${sub.planName} (${sub.interval})</strong> subscription.</p>
      <p>Your subscription is currently <strong>suspended</strong>. To avoid losing access, please update your payment method on PayPal.</p>
      <p>
        <a href="https://www.paypal.com/myaccount/autopay" style="display: inline-block; padding: 10px 20px; background-color: #0079C1; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Payment on PayPal</a>
      </p>
      <p>Once you've updated your payment method, you can reactivate your subscription from your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/requests/account">Account Dashboard</a>.</p>
      <p>If no action is taken, your subscription will be cancelled.</p>
      <p style="font-size: 13px; color: #666; margin-top: 30px;">Thanks,<br>The 6ure Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: defaultFrom,
    to: user.email,
    subject: `Action Required: Payment failed for ${sub.planName}`,
    html,
  });
}

export async function sendSubscriptionCancelledEmail(user: EmailUser, sub: EmailSubscription) {
  if (!user.email) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #333;">
      <h2 style="color: #ed4245;">Subscription Cancelled</h2>
      <p>Hi ${user.username},</p>
      <p>Your subscription for <strong>${sub.planName} (${sub.interval})</strong> has been cancelled.</p>
      <p>If you had remaining time on your billing cycle, your perks will remain active until the end of that period.</p>
      <p>We're sorry to see you go! You can resubscribe at any time from the <a href="${process.env.NEXT_PUBLIC_SITE_URL}/membership">Membership page</a>.</p>
      <p style="font-size: 13px; color: #666; margin-top: 30px;">Thanks,<br>The 6ure Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: defaultFrom,
    to: user.email,
    subject: `Subscription Cancelled: ${sub.planName}`,
    html,
  });
}
