import type { AiWorklogContent } from '../content/aiWorklog.ts'

interface AiWorklogProps {
  worklog: AiWorklogContent
}

/** Отображает AI Worklog. Весь текст приходит из content, здесь только разметка. */
export function AiWorklog({ worklog }: AiWorklogProps) {
  return (
    <section id="ai-worklog" className="worklog" aria-labelledby="ai-worklog-title">
      <div className="worklog__header">
        <h2 id="ai-worklog-title" className="section-title">
          AI Worklog
        </h2>
        <p className="worklog__subtitle">Как использовался AI при разработке этого приложения</p>
      </div>

      <dl className="worklog-facts">
        {worklog.facts.map((fact) => (
          <div key={fact.label} className="worklog-fact">
            <dt>{fact.label}</dt>
            <dd>
              {fact.value}
              {fact.details && (
                <ul className="worklog-fact__details">
                  {fact.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="worklog__block">
        <h3 className="worklog__heading">Этапы работы</h3>
        <ol className="worklog-stages">
          {worklog.stages.map((stage, index) => (
            <li key={stage.id} className="panel worklog-stage">
              <h4 className="worklog-stage__title">
                <span className="worklog-stage__number">{index + 1}.</span> {stage.title}
              </h4>
              <div className="worklog-stage__roles">
                <div>
                  <p className="worklog-stage__role">Человек</p>
                  <ul>
                    {stage.human.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="worklog-stage__role">AI</p>
                  <ul>
                    {stage.ai.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {stage.details && (
                <ul className="worklog-stage__details">
                  {stage.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="worklog__block">
        <h3 className="worklog__heading">Ключевые запросы</h3>
        <p className="worklog__note">Сокращённые примеры ключевых запросов</p>
        <ul className="worklog-prompts">
          {worklog.prompts.map((prompt) => (
            <li key={prompt.text} className="worklog-prompt">
              <span className="worklog-prompt__stage">{prompt.stage}</span>
              <blockquote>{prompt.text}</blockquote>
            </li>
          ))}
        </ul>
      </div>

      <div className="worklog__block">
        <h3 className="worklog__heading">Мои решения</h3>
        <ol className="worklog-decisions">
          {worklog.decisions.map((decision) => (
            <li key={decision.title}>
              <p className="worklog-decisions__title">{decision.title}</p>
              <p className="worklog-decisions__text">{decision.description}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="worklog__block">
        <h3 className="worklog__heading">Где сгенерированный результат потребовал проверки и правки</h3>
        <ul className="worklog-issues">
          {worklog.issues.map((item) => (
            <li key={item.issue} className="worklog-issue">
              <p className="worklog-issue__problem">{item.issue}</p>
              <p className="worklog-issue__resolution">{item.resolution}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="worklog__columns">
        <div className="worklog__block">
          <h3 className="worklog__heading">Что сделано вручную</h3>
          <ul className="worklog-list">
            {worklog.manualWork.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="worklog__block">
          <h3 className="worklog__heading">Как проверялось</h3>
          <ul className="worklog-list">
            {worklog.verification.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="worklog__block">
        <h3 className="worklog__heading">Что улучшить в реальном продукте</h3>
        <ul className="worklog-list">
          {worklog.improvements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
