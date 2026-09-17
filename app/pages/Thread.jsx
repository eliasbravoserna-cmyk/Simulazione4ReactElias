import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorState, Loading } from '../components/AsyncState.jsx';
import CommentsTree from '../components/CommentThread.jsx';
import { getCommentChildren, getItemById } from '../scripts/api.js';
import { stripHtml } from '../scripts/sanitize.js';

/**
 * Header della story per la pagina thread (titolo, meta, testo pulito).
 *
 * @param {object} props - Props del componente
 * @param {object} props.story - Oggetto story mappato
 * @returns {React.JSX.Element} - Componente ThreadHeader.
 */
function ThreadHeader({ story }) {
  const cleanText = stripHtml(story.text || '');

  return (
    <article className="story-card thread-story-card">
      <h3 className="story-title">{story.title}</h3>
      <p className="story-meta">
        ID {story.id} - by {story.by || 'anon'} - {story.timeLabel}
      </p>
      <p className="story-meta">
        Score {story.score} - Commenti {story.descendants}
      </p>
      {cleanText ? <p>{cleanText}</p> : null}
    </article>
  );
}

/**
 * Pagina Thread: story + albero commenti ricorsivo con lazy loading.
 *
 * @returns {React.JSX.Element} - Componente Thread.
 */
function Thread() {
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('idle');
  const [story, setStory] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);

  const loadThread = async (rawId) => {
    const storyId = Number(rawId);

    if (!Number.isFinite(storyId) || storyId <= 0) {
      setStatus('error');
      setError(new Error('Inserisci un ID story numerico valido.'));
      return;
    }

    setStatus('loading');

    try {
      const loadedStory = await getItemById(storyId);

      if (!loadedStory || loadedStory.type !== 'story') {
        setStatus('error');
        setError(new Error("L'ID indicato non corrisponde a una story."));
        return;
      }

      setStory(loadedStory);

      if (!Array.isArray(loadedStory.kids) || loadedStory.kids.length === 0) {
        setComments([]);
        setStatus('empty-comments');
        return;
      }

      const firstLevelComments = await getCommentChildren(loadedStory);
      setComments(firstLevelComments);
      setStatus('success');
    } catch (loadError) {
      setStatus('error');
      setError(loadError);
    }
  };

  useEffect(() => {
    const initialId = searchParams.get('id');

    if (initialId) {
      setInputValue(initialId);
      loadThread(initialId);
    } else {
      setStatus('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      loadThread(inputValue);
    }
  };

  return (
    <main className="main-content">
      <section className="panel page-section">
        <h2>Thread e Commenti</h2>
        <p className="section-description">
          Carica uno story ID e naviga il suo albero commenti con lazy loading dei rami profondi.
        </p>
        <div className="form-grid">
          <div className="form-group input-wide">
            <label htmlFor="thread-id-input">Story ID</label>
            {/* TODO 2: Inserire la classe corretta per mostrare il campo di input.
                 Controllare altre pagine che hanno un form per vedere come è fatto
            */}
            <div className="input-wrapper">
              <input
                id="thread-id-input"
                type="number"
                min="1"
                placeholder="Es: 44309318"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                id="btn-load-thread"
                type="button"
                className="btn btn-primary"
                onClick={() => loadThread(inputValue)}
              >
                Carica Thread
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div id="thread-root">
          {status === 'idle' ? (
            <EmptyState message="Inserisci uno story ID per avviare il caricamento del thread." />
          ) : null}
          {status === 'loading' ? <Loading message="Caricamento thread..." /> : null}
          {status === 'error' ? (
            <ErrorState
              title="Errore"
              message={error?.message || 'Impossibile caricare il thread.'}
            />
          ) : null}
          {status === 'empty-comments' && story ? (
            <>
              <ThreadHeader story={story} />
              <section className="thread-container">
                <EmptyState message="Nessun commento disponibile per questa story." />
              </section>
            </>
          ) : null}
          {status === 'success' && story ? (
            <>
              <ThreadHeader story={story} />
              <CommentsTree comments={comments} depth={0} />
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default Thread;
