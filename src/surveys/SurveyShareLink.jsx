import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import './share.css';

export default function SurveyShareLink({ surveyId }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/s/${surveyId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('아래 공개 링크를 복사해 주세요.', publicUrl);
    }
  };

  return (
    <aside className="survey-share-card" aria-label="설문 공개 링크">
      <div className="survey-share-copy">
        <strong>응답 링크</strong>
        <p>설문이 발행된 상태일 때만 로그인 없이 열 수 있어요.</p>
        <code>{publicUrl}</code>
      </div>
      <div className="survey-share-actions">
        <a className="survey-button survey-button-secondary" href={publicUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> 링크 열기
        </a>
        <button className="survey-button survey-button-primary" type="button" onClick={copyLink}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? '복사했어요' : '링크 복사'}
        </button>
      </div>
    </aside>
  );
}
