// 메일 발송 Provider — 지금은 콘솔 fallback, 나중에 SES 로 전환할 수 있어요.
//
//   MAIL_PROVIDER=console (기본)
//     → 서버 콘솔에 재설정 링크를 출력합니다. 자격 증명 없이 개발·테스트 가능.
//   MAIL_PROVIDER=ses
//     → AWS SES v2 로 실제 메일을 보냅니다. SES 자격 증명·검증된 발신 도메인이 필요해요.
//
// ⚠️ SES 를 켜기 전에 `@aws-sdk/client-sesv2` 패키지가 설치돼 있어야 해요.
//    (동적 import 라서 console 모드에서는 패키지가 없어도 앱이 정상 기동합니다)
export class MailProvider {
  #provider;
  #from;
  #region;

  constructor({ config }) {
    this.#provider = config.MAIL_PROVIDER;
    this.#from = config.MAIL_FROM;
    this.#region = config.SES_REGION;
  }

  async sendPasswordReset({ to, resetUrl, expiresAt }) {
    if (this.#provider === 'ses') {
      return this.#sendWithSes({ to, resetUrl, expiresAt });
    }

    // console fallback — 개발자가 링크를 바로 복사할 수 있게 한 줄로 남겨요.
    console.info(
      `[mail:console] 비밀번호 재설정 메일 → ${to}\n` +
        `  링크: ${resetUrl}\n` +
        `  만료: ${new Date(expiresAt).toISOString()}`,
    );
    return { provider: 'console' };
  }

  async #sendWithSes({ to, resetUrl, expiresAt }) {
    let SESv2Client;
    let SendEmailCommand;

    try {
      ({ SESv2Client, SendEmailCommand } = await import('@aws-sdk/client-sesv2'));
    } catch {
      throw new Error(
        'MAIL_PROVIDER=ses 를 쓰려면 `pnpm add @aws-sdk/client-sesv2` 로 패키지를 설치해 주세요.',
      );
    }

    const client = new SESv2Client({ region: this.#region });
    const expiresText = new Date(expiresAt).toISOString();

    await client.send(
      new SendEmailCommand({
        FromEmailAddress: this.#from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: '[독스루] 비밀번호 재설정 안내', Charset: 'UTF-8' },
            Body: {
              Text: {
                Data:
                  '아래 링크에서 비밀번호를 재설정해 주세요.\n\n' +
                  `${resetUrl}\n\n` +
                  `이 링크는 ${expiresText} 까지 한 번만 사용할 수 있어요.\n` +
                  '본인이 요청하지 않았다면 이 메일을 무시해 주세요.',
                Charset: 'UTF-8',
              },
            },
          },
        },
      }),
    );

    return { provider: 'ses' };
  }
}
