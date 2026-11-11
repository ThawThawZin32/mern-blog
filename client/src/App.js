import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'mern-blog-token';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const api = axios.create({ baseURL: API_BASE_URL });

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
}

function getImageUrl(imagePath) {
  if (!imagePath) {
    return '';
  }
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  return `${API_BASE_URL}/${imagePath.replace(/^\/+/, '')}`;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState('');

  const imagePreviewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : ''),
    [image],
  );

  useEffect(() => {
    setImagePreview(imagePreviewUrl);
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const response = await api.get('/api/posts');
      setPosts(response.data.data.posts);
    } catch (error) {
      setPostsError(getErrorMessage(error));
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    setAuthLoading(true);
    api.get('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (active) {
          setUser(response.data.data.user);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        if (error.response?.status === 401) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken('');
          setUser(null);
        } else {
          setLoginError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await api.post('/api/users/login', { email, password });
      const { token: nextToken, user: nextUser } = response.data.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      setUser(nextUser);
      setToken(nextToken);
      setPassword('');
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setUser(null);
    setPostMessage('');
    setPostError('');
  }

  function handleImageChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    setImageError('');
    setPostError('');

    if (selectedFile && !ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
      setImage(null);
      setImageError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (selectedFile && selectedFile.size > MAX_IMAGE_SIZE) {
      setImage(null);
      setImageError('The image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setImage(selectedFile);
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    setPostError('');
    setPostMessage('');
    setPostLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tags', tags);
    if (image) {
      formData.append('coverImage', image);
    }

    try {
      const response = await api.post('/api/posts', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((currentPosts) => [response.data.data.post, ...currentPosts]);
      setTitle('');
      setContent('');
      setTags('');
      setImage(null);
      setImageError('');
      setPostMessage('Your post has been published.');
      event.currentTarget.reset();
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
        setPostError('Your session has expired. Please log in again.');
      } else {
        setPostError(getErrorMessage(error));
      }
    } finally {
      setPostLoading(false);
    }
  }

  return (
    <div className="blog-app">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Inkline home">
          <span className="brand-mark" aria-hidden="true">i</span>
          <span>inkline</span>
        </a>
        <div className="header-account">
          {user ? (
            <>
              <span className="account-name">Hi, {user.name}</span>
              <button className="button button-quiet" type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <a className="header-login" href="#login">Log in</a>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">A little space for big ideas</p>
            <h1>Stories worth<br />staying for.</h1>
            <p className="hero-description">
              Share what you know, what you wonder, and what you can’t stop thinking about.
            </p>
            <a className="button button-dark hero-button" href={user ? '#write' : '#login'}>
              {user ? 'Write a story' : 'Get started'} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="art-sun" />
            <span className="art-arch art-arch-back" />
            <span className="art-arch art-arch-front" />
            <span className="art-leaf art-leaf-one" />
            <span className="art-leaf art-leaf-two" />
            <span className="art-caption">WORDS<br />MAKE WORLDS</span>
          </div>
          <span className="hero-index" aria-hidden="true">01 / JOURNAL</span>
        </section>

        <div className="content-grid">
          <section className="feed-section" aria-labelledby="latest-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">From the community</p>
                <h2 id="latest-heading">Latest stories</h2>
              </div>
              <span className="story-count">{posts.length.toString().padStart(2, '0')} STORIES</span>
            </div>

            {postsLoading && <p className="status-message">Loading stories…</p>}
            {!postsLoading && postsError && (
              <div className="error-box" role="alert">
                <span>{postsError}</span>
                <button className="text-button" type="button" onClick={loadPosts}>Try again</button>
              </div>
            )}
            {!postsLoading && !postsError && posts.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">✳</span>
                <h3>The first page is yours.</h3>
                <p>There aren’t any stories yet. Start one and let the conversation begin.</p>
              </div>
            )}
            {!postsLoading && !postsError && posts.length > 0 && (
              <div className="story-list">
                {posts.map((post) => (
                  <article className="story-card" key={post._id}>
                    {post.coverImage && (
                      <img
                        className="story-image"
                        src={getImageUrl(post.coverImage)}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    <div className="story-body">
                      <div className="story-meta">
                        <span>{post.author?.name || 'Inkline author'}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={post.createdAt}>
                          {new Date(post.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </div>
                      <h3>{post.title}</h3>
                      <p className="story-excerpt">{post.content}</p>
                      {post.tags?.length > 0 && (
                        <ul className="tag-list" aria-label="Tags">
                          {post.tags.map((tag) => <li key={tag}>{tag}</li>)}
                        </ul>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="sidebar">
            {authLoading ? (
              <section className="panel auth-panel">
                <p className="status-message">Checking your session…</p>
              </section>
            ) : user ? (
              <section className="panel compose-panel" id="write" aria-labelledby="compose-heading">
                <div className="panel-kicker">
                  <span className="panel-icon" aria-hidden="true">✳</span>
                  <span>YOUR SPACE</span>
                </div>
                <h2 id="compose-heading">Write a story</h2>
                <p className="panel-description">A good story starts with a first line.</p>
                <form className="compose-form" onSubmit={handleCreatePost}>
                  <label htmlFor="post-title">Title</label>
                  <input
                    id="post-title"
                    name="title"
                    type="text"
                    placeholder="Give your story a title"
                    minLength="3"
                    maxLength="160"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />

                  <label htmlFor="post-content">Your story</label>
                  <textarea
                    id="post-content"
                    name="content"
                    placeholder="Start writing here…"
                    maxLength="50000"
                    rows="6"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    required
                  />

                  <label htmlFor="post-tags">Tags <span className="optional-label">OPTIONAL</span></label>
                  <input
                    id="post-tags"
                    name="tags"
                    type="text"
                    placeholder="design, travel, ideas"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                  <p className="field-hint">Separate tags with commas (up to 10).</p>

                  <label className="upload-label" htmlFor="cover-image">
                    <span className="upload-icon" aria-hidden="true">↥</span>
                    <span>
                      <strong>{image ? image.name : 'Add a cover image'}</strong>
                      <small>JPEG, PNG or WebP · up to 5 MB · optional</small>
                    </span>
                    <span className="upload-action">BROWSE</span>
                  </label>
                  <input
                    className="visually-hidden"
                    id="cover-image"
                    name="coverImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                  />

                  {imagePreview && (
                    <div className="image-preview-wrap">
                      <img className="image-preview" src={imagePreview} alt="Cover preview" />
                      <button
                        className="remove-image"
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImageError('');
                          const input = document.getElementById('cover-image');
                          if (input) input.value = '';
                        }}
                      >
                        Remove image
                      </button>
                    </div>
                  )}

                  {imageError && <p className="form-error" role="alert">{imageError}</p>}
                  {postError && <p className="form-error" role="alert">{postError}</p>}
                  {postMessage && <p className="form-success" role="status">{postMessage}</p>}
                  <button className="button button-dark submit-button" type="submit" disabled={postLoading}>
                    {postLoading ? 'Publishing…' : 'Publish story'}
                    {!postLoading && <span aria-hidden="true">↗</span>}
                  </button>
                </form>
              </section>
            ) : (
              <section className="panel auth-panel" id="login" aria-labelledby="login-heading">
                <div className="panel-kicker">
                  <span className="panel-icon" aria-hidden="true">↗</span>
                  <span>WELCOME BACK</span>
                </div>
                <h2 id="login-heading">Good stories<br />start with you.</h2>
                <p className="panel-description">Log in to share your next idea with the community.</p>

                <form className="login-form" onSubmit={handleLogin}>
                  <label htmlFor="login-email">Email address</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />

                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />

                  {loginError && <p className="form-error" role="alert">{loginError}</p>}
                  <button className="button button-dark submit-button" type="submit" disabled={loginLoading}>
                    {loginLoading ? 'Logging in…' : 'Log in'}
                    {!loginLoading && <span aria-hidden="true">↗</span>}
                  </button>
                </form>
                <p className="signup-note">
                  New here? <span>Create an account through the API to get started.</span>
                </p>
              </section>
            )}

            <section className="note-card">
              <span className="note-spark" aria-hidden="true">✳</span>
              <p>“A writer is someone for whom writing is more difficult than it is for other people.”</p>
              <span className="note-author">— THOMAS MANN</span>
            </section>
            <p className="sidebar-footer">MAKE SOMETHING MEANINGFUL.</p>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="/" aria-label="Inkline home">
          <span className="brand-mark" aria-hidden="true">i</span>
          <span>inkline</span>
        </a>
        <span>A home for your thoughts.</span>
        <span>© {new Date().getFullYear()} INKLINE</span>
      </footer>
    </div>
  );
}

export default App;
