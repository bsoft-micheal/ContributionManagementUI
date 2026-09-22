const fs = require('fs');
const path = require('path');

const targetFile = 'D:\\ContributionManagement\\backend\\ContributionManagement\\TeamContributionManagementSystem.Application\\Services\\EventService.cs';

if (!fs.existsSync(targetFile)) {
  console.error('Target file not found:', targetFile);
  process.exit(1);
}

// Create backup
const backupFile = targetFile + '.bak';
fs.copyFileSync(targetFile, backupFile);
console.log('Backup created at:', backupFile);

let content = fs.readFileSync(targetFile, 'utf8');

// Replacement 1: Compute dynamic UPI URI and dynamic QR code image URL for each contributor
const oldPattern1 = `                            var hasInlineScanner = !string.IsNullOrWhiteSpace(gpayImagePath) && File.Exists(gpayImagePath);`;

const newCode1 = `                            var memberContributionAmount = contributor.ContributionAmount;
                            var upiPaymentUri = $"upi://pay?pa={upiId}&pn={Uri.EscapeDataString(upiReceiverName)}&am={memberContributionAmount:F2}&cu=INR&tn={Uri.EscapeDataString("Contribution for " + eventName)}";
                            var memberQrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data={Uri.EscapeDataString(upiPaymentUri)}";
                            var hasInlineScanner = false;`;

if (content.includes(oldPattern1)) {
  content = content.replace(oldPattern1, newCode1);
  console.log('Successfully replaced dynamic QR URL generation.');
} else {
  console.warn('Could not find oldPattern1');
}

// Replacement 2: Replace payment card HTML with clean black and white QR code scanner
const oldCardSearch = `<!-- Scanner & UPI Payment Card -->`;
const oldCardEnd = `</table>\r\n            </div>`;
const oldCardEndLF = `</table>\n            </div>`;

const newCardHtml = `<!-- Dynamic UPI QR Scanner Card -->
            <div class=""payment-card"" style=""background: #ffffff; border: 1.5px solid #ede9fe; border-radius: 14px; padding: 20px; margin: 22px 0; text-align: center; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.08);"">
                <div style=""font-family: 'Outfit', 'Inter', sans-serif; font-size: 13px; font-weight: 700; color: #4338ca; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase;"">
                    Scan QR Code to Pay via UPI
                </div>
                <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                    <tr>
                        <td align=""center"" style=""padding: 0 0 14px 0;"">
                            <div style=""display: inline-block; padding: 12px; background: #ffffff; border: 2px solid #7c3aed; border-radius: 12px; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);"">
                                <a href=""{upiPaymentUri}"" style=""text-decoration: none; display: block;"">
                                    <img src=""{memberQrCodeUrl}"" alt=""UPI Payment QR Code - {upiReceiverName}"" width=""220"" height=""220"" style=""display: block; margin: 0 auto; border-radius: 6px;"" />
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td align=""center"" style=""padding: 4px 0; font-family: 'Outfit', 'Inter', 'Segoe UI', sans-serif;"">
                            <div style=""font-size: 14px; color: #475569; margin-bottom: 6px;"">
                                Payee: <strong style=""color: #0f172a;"">{upiReceiverName}</strong>
                            </div>
                            <div style=""font-size: 14px; color: #334155; margin-bottom: 8px;"">
                                <span style=""font-weight: 600; color: #64748b; margin-right: 6px;"">UPI ID:</span>
                                <span style=""color: #312e81; background-color: #eef2ff; font-weight: 700; padding: 4px 12px; border-radius: 6px; font-family: 'Outfit', 'Courier New', monospace; letter-spacing: 0.5px; border: 1px solid #c7d2fe;"">{upiId}</span>
                            </div>
                            <div style=""font-size: 12px; color: #64748b; margin-top: 4px;"">
                                Scan with Google Pay, PhonePe, Paytm, or Camera to pay automatically.
                            </div>
                            <div style=""margin-top: 10px;"">
                                <a href=""{upiPaymentUri}"" style=""display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 12.5px; font-weight: 700; padding: 7px 18px; border-radius: 6px;"">Open UPI App (Rs.{memberContributionAmount:F2})</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>`;

const cardStartIndex = content.indexOf(oldCardSearch);
if (cardStartIndex !== -1) {
  let cardEndIndex = content.indexOf(`</table>\r\n            </div>`, cardStartIndex);
  let endLength = `</table>\r\n            </div>`.length;
  if (cardEndIndex === -1) {
    cardEndIndex = content.indexOf(`</table>\n            </div>`, cardStartIndex);
    endLength = `</table>\n            </div>`.length;
  }
  if (cardEndIndex !== -1) {
    content = content.substring(0, cardStartIndex) + newCardHtml + content.substring(cardEndIndex + endLength);
    console.log('Successfully replaced payment card HTML with dynamic QR card.');
  } else {
    console.warn('Could not find card end');
  }
} else {
  console.warn('Could not find cardStartIndex');
}

// Replacement 3: inlineImages set to null
const oldInlineImages = `                            var inlineImages = hasInlineScanner
                                ? new[] { new InlineEmailImage("gpay-banner", gpayImagePath!, "image/png") }
                                : null;`;
const oldInlineImagesLF = `                            var inlineImages = hasInlineScanner\n                                ? new[] { new InlineEmailImage("gpay-banner", gpayImagePath!, "image/png") }\n                                : null;`;
const newInlineImages = `                            var inlineImages = (InlineEmailImage[]?)null;`;

if (content.includes(oldInlineImages)) {
  content = content.replace(oldInlineImages, newInlineImages);
  console.log('Successfully updated inlineImages to null (CRLF).');
} else if (content.includes(oldInlineImagesLF)) {
  content = content.replace(oldInlineImagesLF, newInlineImages);
  console.log('Successfully updated inlineImages to null (LF).');
} else {
  console.warn('Could not find oldInlineImages');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('EventService.cs updated successfully!');

// Also rename gpay.png in wwwroot so no fallback to gpay image can occur
const gpayFile = 'D:\\ContributionManagement\\backend\\ContributionManagement\\TeamContributionManagementSystem.API\\wwwroot\\gpay.png';
if (fs.existsSync(gpayFile)) {
  try {
    fs.renameSync(gpayFile, gpayFile + '.old');
    console.log('Renamed gpay.png to gpay.png.old');
  } catch (e) {
    console.warn('Could not rename gpay.png:', e.message);
  }
}
