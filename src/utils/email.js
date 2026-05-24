const nodemailer = require('nodemailer')
const { mail, nodeEnv } = require('../config/env')

// Create Transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    auth: {
      user: mail.user,
      pass: mail.pass,
    },
  })
}

// Send Email
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `Payrolla <${mail.from}>`,
      to,
      subject,
      html,
    }

    const info = await transporter.sendMail(mailOptions)

    if (nodeEnv === 'development') {
      console.log(`Email sent: ${info.messageId}`)
    }

    return info
  } catch (error) {
    console.error(`Email error: ${error.message}`)
    throw new Error('Email could not be sent')
  }
}

// Email Templates
const emailTemplates = {
  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request - Payrolla',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #185FA5;">Payrolla</h2>
        <p>You requested a password reset. Click the button below to reset your password.</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #185FA5; 
                  color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 13px;">This link expires in <strong>10 minutes.</strong></p>
        <p style="color: #666; font-size: 13px;">If you did not request this, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0"/>
        <p style="color: #999; font-size: 11px;">Payrolla Payroll Management System</p>
      </div>
    `,
  }),

  inviteEmployee: (inviteUrl, firstName) => ({
    subject: 'You have been invited to Payrolla',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #185FA5;">Welcome to Payrolla</h2>
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>You have been added to the Payrolla payroll system. Click the button below to set up your account.</p>
        <a href="${inviteUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #185FA5; 
                  color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Accept Invite
        </a>
        <p style="color: #666; font-size: 13px;">This link expires in <strong>24 hours.</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0"/>
        <p style="color: #999; font-size: 11px;">Payrolla Payroll Management System</p>
      </div>
    `,
  }),

  payslipNotification: (firstName, period, payslip) => ({
    subject: `Your Payslip for ${period} - Payrolla`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #333;">
      <h2 style="color: #185FA5;">Payrolla</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Please find your payslip details for <strong>${period}</strong> below.</p>

      <div style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin: 24px 0;">
        
        <!-- Header -->
        <div style="background: #0F172A; padding: 16px 24px;">
          <p style="color: #fff; font-size: 16px; font-weight: bold; margin: 0;">
            ${payslip.employeeSnapshot.accountName || `${firstName}`}
          </p>
          <p style="color: #94A3B8; font-size: 12px; margin: 4px 0 0;">
            ${payslip.employeeSnapshot.employeeId} · 
            ${payslip.employeeSnapshot.department} · 
            ${payslip.employeeSnapshot.jobTitle}
          </p>
        </div>

        <!-- Period -->
        <div style="background: #F8FAFC; padding: 12px 24px; border-bottom: 1px solid #eee;">
          <p style="margin: 0; font-size: 13px; color: #666;">
            <strong>Period:</strong> ${period} &nbsp;|&nbsp;
            <strong>Pay Date:</strong> ${new Date(payslip.payDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <!-- Earnings -->
        <div style="padding: 16px 24px; border-bottom: 1px solid #eee;">
          <p style="font-size: 12px; font-weight: bold; color: #666; letter-spacing: 0.05em; margin: 0 0 12px;">EARNINGS</p>
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #555;">Basic Salary</td>
              <td style="text-align: right; padding: 4px 0;">₦${payslip.earnings.basicSalary.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Housing Allowance</td>
              <td style="text-align: right; padding: 4px 0;">₦${payslip.earnings.housing.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Transport Allowance</td>
              <td style="text-align: right; padding: 4px 0;">₦${payslip.earnings.transport.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Meal Allowance</td>
              <td style="text-align: right; padding: 4px 0;">₦${payslip.earnings.meal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Utility Allowance</td>
              <td style="text-align: right; padding: 4px 0;">₦${payslip.earnings.utility.toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 8px 0 4px; font-weight: bold;">Gross Salary</td>
              <td style="text-align: right; padding: 8px 0 4px; font-weight: bold;">₦${payslip.earnings.grossSalary.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Deductions -->
        <div style="padding: 16px 24px; border-bottom: 1px solid #eee;">
          <p style="font-size: 12px; font-weight: bold; color: #666; letter-spacing: 0.05em; margin: 0 0 12px;">DEDUCTIONS</p>
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #555;">PAYE Tax</td>
              <td style="text-align: right; padding: 4px 0; color: #DC2626;">-₦${payslip.deductions.paye.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Employee Pension (8%)</td>
              <td style="text-align: right; padding: 4px 0; color: #DC2626;">-₦${payslip.deductions.employeePension.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">NHF (2.5%)</td>
              <td style="text-align: right; padding: 4px 0; color: #DC2626;">-₦${payslip.deductions.nhf.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Loan Repayment</td>
              <td style="text-align: right; padding: 4px 0; color: #DC2626;">-₦${payslip.deductions.loanRepayment.toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px solid #eee;">
              <td style="padding: 8px 0 4px; font-weight: bold;">Total Deductions</td>
              <td style="text-align: right; padding: 8px 0 4px; font-weight: bold; color: #DC2626;">-₦${payslip.deductions.totalDeductions.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Employer Contributions -->
        <div style="padding: 16px 24px; border-bottom: 1px solid #eee;">
          <p style="font-size: 12px; font-weight: bold; color: #666; letter-spacing: 0.05em; margin: 0 0 12px;">EMPLOYER CONTRIBUTIONS</p>
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #555;">Employer Pension (10%)</td>
              <td style="text-align: right; padding: 4px 0; color: #185FA5;">₦${payslip.employerContributions.employerPension.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Net Pay -->
        <div style="background: #0F172A; padding: 16px 24px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #94A3B8; font-size: 13px;">Net Pay (Take Home)</td>
              <td style="text-align: right; color: #fff; font-size: 20px; font-weight: bold;">
                ₦${payslip.netSalary.toLocaleString()}
              </td>
            </tr>
          </table>
        </div>

      </div>

      <p style="color: #666; font-size: 12px;">
        This is an automatically generated payslip. Please do not reply to this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0"/>
      <p style="color: #999; font-size: 11px;">Payrolla Payroll Management System</p>
    </div>
  `,
}),

  loginNotification: (firstName, loginTime, ipAddress, userAgent) => ({
  subject: 'New Login Detected - Payrolla',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #185FA5;">Payrolla</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>A new login was detected on your Payrolla account.</p>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #666;">
          <strong>Time:</strong> ${loginTime}
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #666;">
          <strong>IP Address:</strong> ${ipAddress}
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #666;">
          <strong>Device:</strong> ${userAgent || 'Unknown'}
        </p>
      </div>
      <p style="color: #666; font-size: 13px;">
        If this was you, ignore this email. If it wasn't you, 
        <a href="${process.env.CLIENT_URL}/forgot-password" style="color: #185FA5;">
          reset your password immediately.
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0"/>
      <p style="color: #999; font-size: 11px;">Payrolla Payroll Management System</p>
    </div>
  `,
  }),

  welcomeEmail: (firstName) => ({
    subject: 'Welcome to Payrolla 🎉',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #185FA5;">Welcome to Payrolla</h2>
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>Your account has been set up successfully. You now have access to the Payrolla payroll system.</p>
        <p>Here's what you can do:</p>
        <ul style="color: #444; font-size: 14px; line-height: 1.8;">
            <li>View and download your monthly payslips</li>
            <li>Track your salary breakdown and deductions</li>
            <li>Update your profile information</li>
        </ul>
        <a href="${process.env.CLIENT_URL}/login" 
            style="display: inline-block; padding: 12px 24px; background: #185FA5; 
                    color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Go to Payrolla
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0"/>
        <p style="color: #999; font-size: 11px;">Payrolla Payroll Management System</p>
        </div>
    `,
  }),
}

module.exports = { sendEmail, emailTemplates }