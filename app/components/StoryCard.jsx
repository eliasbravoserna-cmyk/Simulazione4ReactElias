import { Link } from 'react-router';

/**
 * Card per una singola story.
 *
 * @param {object} props - Props del componente
 * @param {object} props.story - Oggetto story mappato
 * @param {boolean} [props.showActions=false] - Mostra i pulsanti di azione
 * @param {boolean} [props.showThreadButton=true] - Mostra il pulsante per aprire il thread
 * @param {string} [props.feedVariant="default"] - Variante di feed (es. "top-stories")
 * @param {boolean} [props.isSaved=false] - Indica se la story è salvata
 * @param {Function} [props.onToggleSave] - Callback per il toggle save
 * @returns {React.JSX.Element} - Componente StoryCard.
 */
function StoryCard({
  story,
  showActions = false,
  showThreadButton = true,
  feedVariant = 'default',
  isSaved = false,
  onToggleSave,
}) {
  const title = story.title || 'Senza titolo';
  const author = story.by || 'anon';
  const meta = `Score ${story.score} - Commenti ${story.descendants} - ${story.timeLabel}`;
  const threadHref = `/thread?id=${encodeURIComponent(story.id)}`;

  const link = story.url ? (
    <a href={story.url} target="_blank" rel="noreferrer">
      Apri sorgente
    </a>
  ) : (
    <span>Link non disponibile</span>
  );

  const authorLink =
    author !== 'anon' ? (
      <Link to={`/profile?user=${encodeURIComponent(story.by)}`}>{author}</Link>
    ) : (
      author
    );

  const titleLink = (
    <Link className="story-title-link" to={threadHref}>
      {title}
    </Link>
  );

  const actions = showActions ? (
    <div className="story-actions">
      {showThreadButton ? (
        <Link className="btn btn-secondary btn-thread" to={threadHref}>
          Apri thread
        </Link>
      ) : null}
      <button
        type="button"
        className={`btn btn-secondary btn-save${isSaved ? ' is-saved' : ''}`}
        aria-label={isSaved ? "Rimuovi dall'elenco" : 'Salva per dopo'}
        onClick={() => onToggleSave?.(story)}
      >
        {isSaved ? '✕' : '📖'}
      </button>
    </div>
  ) : showThreadButton ? (
    <Link className="btn btn-secondary btn-thread" to={threadHref}>
      Apri thread
    </Link>
  ) : null;

  // TODO 1: Completare il markup della card usando le variabili create precedentemente.
  // Manca da inserire il titleLink dentro un h3 con classe "story-title" dentro il div "story-header".
  // Inserire poi story.id e authorLink dentro un paragrafo con classe "story-meta"
  // Infine inserire meta e link nei rispettivi paragrafi con classe "story-meta"
  return (
    <article className={`story-card${feedVariant === 'top-stories' ? ' story-card--feed' : ''}`}>
      <div className="story-header">
        {actions}
        <h3 className="story-title">{titleLink}</h3>
      </div>

      <p className="story-meta">{story.id}</p>

      <p className="story-meta">{authorLink}</p>

      <p className="story-meta">{meta}</p>

      <p className="story-meta">{link}</p>
    </article>
  );
}

export default StoryCard;
