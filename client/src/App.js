import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'mern-blog-token';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CATEGORIES = [
  'Agriculture',
  'Business',
  'Education',
  'Entertainment',
  'Art',
  'Investment',
  'Uncategorized',
  'Weather',
];
const api = axios.create({ baseURL: API_BASE_URL });

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
}

function getUtf8ByteLength(value) {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint > 0xffff) {
      index += 1;
    }
    byteLength += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return byteLength;
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

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Date unavailable';
  }

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000);
  const timeUnits = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  const [unit, secondsPerUnit] = timeUnits.find(([, seconds]) => (
    Math.abs(elapsedSeconds) >= seconds
  )) || timeUnits[timeUnits.length - 1];

  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    .format(Math.round(elapsedSeconds / secondsPerUnit), unit);
}

function getAuthorInitials(name) {
  return (name || 'Inkline author')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

function getPostCategory(post) {
  const tags = post.tags || [];
  return CATEGORIES.find((category) => (
    tags.some((tag) => tag.toLowerCase() === category.toLowerCase())
  )) || tags[0] || 'Uncategorized';
}

function AuthorByline({ author, createdAt, className = '' }) {
  const authorName = author?.name || 'Inkline author';

  return (
    <div className={`story-author ${className}`}>
      <span className="story-avatar">
        {author?.profilePicture ? (
          <img
            src={getImageUrl(author.profilePicture)}
            alt={`Portrait of ${authorName}`}
            loading="lazy"
          />
        ) : (
          <span className="story-avatar-fallback" aria-hidden="true">
            {getAuthorInitials(authorName)}
          </span>
        )}
      </span>
      <span className="story-author-info">
        <span className="story-author-name">{authorName}</span>
        <time className="story-time" dateTime={createdAt}>
          {formatRelativeTime(createdAt)}
        </time>
      </span>
    </div>
  );
}

function Brand({ footer = false }) {
  return (
    <Link className={`brand${footer ? ' footer-brand' : ''}`} to="/" aria-label="Inkline home">
      <span className="brand-mark" aria-hidden="true">i</span>
      <span>inkline</span>
    </Link>
  );
}

function Header({ user, onLogout }) {
  const userId = user?.id || user?._id;

  return (
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="Main navigation">
        {user && <Link className="nav-link" to="/#write">Create Post</Link>}
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/authors">
          Authors
        </NavLink>
        {!user ? (
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/signin">
            Login
          </NavLink>
        ) : (
          <>
            <Link className="header-profile" to={`/profile/${userId}`}>
              <span className="header-avatar">
                {user.profilePicture ? (
                  <img src={getImageUrl(user.profilePicture)} alt="" />
                ) : (
                  getAuthorInitials(user.name || user.username)
                )}
              </span>
              <span>{user.username || user.name || 'Profile'}</span>
            </Link>
            <button className="button button-quiet" type="button" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

function AuthPage({ mode, error, loading, onSubmit }) {
  const isSignup = mode === 'signup';
  const [fullName, setFullName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onSubmit(event, {
      mode,
      fullName,
      profilePicture,
      email,
      password,
      confirmPassword,
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-welcome" aria-labelledby="auth-welcome-heading">
        <p className="eyebrow">{isSignup ? 'A place to begin' : 'Welcome back'}</p>
        <h1 id="auth-welcome-heading">
          {isSignup ? <>Make room<br />for your ideas.</> : <>Good stories<br />start with you.</>}
        </h1>
        <p>
          {isSignup
            ? 'Create a little space for the things you want to share. Your next story starts here.'
            : 'Pick up where you left off, and share the ideas only you can bring to life.'}
        </p>
        <div className="welcome-art" aria-hidden="true">
          <span className="welcome-art-sun" />
          <span className="welcome-art-arch" />
          <span className="welcome-art-leaf" />
          <span className="welcome-art-caption">WORDS<br />MAKE WORLDS</span>
        </div>
        <span className="welcome-note">THOUGHTFULLY MADE. OPEN TO EVERYONE.</span>
      </section>

      <section className="panel auth-panel" aria-labelledby="auth-form-heading">
        <div className="panel-kicker">
          <span className="panel-icon" aria-hidden="true">{isSignup ? '✳' : '↗'}</span>
          <span>{isSignup ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</span>
        </div>
        <h2 id="auth-form-heading">{isSignup ? 'Create your account' : 'Sign in'}</h2>
        <p className="panel-description">
          {isSignup
            ? 'A few details and you’re ready to share your first story.'
            : 'Welcome back. Enter your details to continue.'}
        </p>

        <form className="login-form" onSubmit={submit}>
          {isSignup && (
            <>
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength="80"
                placeholder="Your name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
              <label htmlFor="signup-profile-picture">Profile picture (optional)</label>
              <input
                id="signup-profile-picture"
                name="profilePicture"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setProfilePicture(event.target.files?.[0] || null)}
              />
            </>
          )}
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={isSignup ? 8 : undefined}
            placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {isSignup && (
            <>
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength="8"
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark submit-button" type="submit" disabled={loading}>
            {loading
              ? (isSignup ? 'Creating account…' : 'Logging in…')
              : (isSignup ? 'Create account' : 'Log in')}
            {!loading && <span aria-hidden="true">↗</span>}
          </button>
        </form>

        <p className="signup-note auth-switch-note">
          {isSignup ? 'Already have an account?' : 'New to Inkline?'}
          {' '}
          <Link className="auth-switch-button" to={isSignup ? '/signin' : '/signup'}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </section>
    </main>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">A little space for big ideas</p>
        <h1>Stories worth<br />staying for.</h1>
        <p className="hero-description">
          Share what you know, what you wonder, and what you can’t stop thinking about.
        </p>
        <a className="button button-dark hero-button" href="#write">
          Write a story <span aria-hidden="true">↗</span>
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
  );
}

function StoryFeed({ posts, loading, error, onRetry, selectedCategory }) {
  return (
    <section className="feed-section" id="authors" aria-labelledby="latest-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">From the community</p>
          <h2 id="latest-heading">Latest stories</h2>
        </div>
        <span className="story-count">{posts.length.toString().padStart(2, '0')} STORIES</span>
      </div>

      {loading && <p className="status-message">Loading stories…</p>}
      {!loading && error && (
        <div className="error-box" role="alert">
          <span>{error}</span>
          <button className="text-button" type="button" onClick={onRetry}>Try again</button>
        </div>
      )}
      {!loading && !error && posts.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">✳</span>
          <h3>{selectedCategory ? 'No Posts found' : 'The first page is yours.'}</h3>
          <p>
            {selectedCategory
              ? `There are no posts in ${selectedCategory}.`
              : 'There aren’t any stories yet. Start one and let the conversation begin.'}
          </p>
        </div>
      )}
      {!loading && !error && posts.length > 0 && (
        <div className="story-grid">
          {posts.map((post) => {
            return (
              <Link
                className="story-card-link"
                to={`/post/${post._id}`}
                aria-label={`Read story: ${post.title}`}
                key={post._id}
              >
                <article className="story-card">
                  <div className="story-media">
                    {post.coverImage ? (
                      <img
                        className="story-image"
                        src={getImageUrl(post.coverImage)}
                        alt={`${post.title} cover`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="story-image-placeholder" aria-hidden="true">
                        <span>INKLINE JOURNAL</span>
                      </div>
                    )}
                  </div>
                  <div className="story-body">
                    <h3>{post.title}</h3>
                    <p className="story-excerpt">{post.content}</p>
                    <div className="story-footer">
                      <AuthorByline author={post.author} createdAt={post.createdAt} />
                      <ul className="tag-list" aria-label={`${post.title} category`}>
                        <li>{getPostCategory(post)}</li>
                      </ul>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setPost(null);
    setLoading(true);
    setError('');

    api.get(`/api/posts/${encodeURIComponent(id)}`)
      .then((response) => {
        if (active) setPost(response.data.data.post);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  return (
    <main className="post-detail-page">
      <Link className="post-back-link" to="/">← Back to stories</Link>
      {loading && <p className="status-message" role="status">Loading story…</p>}
      {!loading && error && (
        <div className="error-box" role="alert">
          <span>{error}</span>
          <button
            className="text-button"
            type="button"
            onClick={() => setRetryCount((currentCount) => currentCount + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!loading && !error && post && (
        <article className="post-detail">
          {post.coverImage && (
            <div className="post-detail-cover">
              <img src={getImageUrl(post.coverImage)} alt={`${post.title} cover`} />
            </div>
          )}
          <div className="post-detail-body">
            {post.tags?.length > 0 && (
              <ul className="post-detail-tags" aria-label="Tags">
                {post.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            )}
            <h1>{post.title}</h1>
            <AuthorByline
              className="post-detail-author"
              author={post.author}
              createdAt={post.createdAt}
            />
            <div className="post-detail-content">{post.content}</div>
          </div>
        </article>
      )}
    </main>
  );
}

function Composer({
  title,
  setTitle,
  content,
  setContent,
  tags,
  setTags,
  image,
  imagePreview,
  onImageChange,
  onRemoveImage,
  imageError,
  postError,
  postMessage,
  postLoading,
  onSubmit,
}) {
  return (
    <section className="panel compose-panel" id="write" aria-labelledby="compose-heading">
      <div className="panel-kicker">
        <span className="panel-icon" aria-hidden="true">✳</span>
        <span>YOUR SPACE</span>
      </div>
      <h2 id="compose-heading">Write a story</h2>
      <p className="panel-description">A good story starts with a first line.</p>
      <form className="compose-form" onSubmit={onSubmit}>
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
          onChange={onImageChange}
        />
        {imagePreview && (
          <div className="image-preview-wrap">
            <img className="image-preview" src={imagePreview} alt="Cover preview" />
            <button className="remove-image" type="button" onClick={onRemoveImage}>
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
  );
}

function HomePage({
  user,
  posts,
  loading,
  error,
  onRetry,
  composerProps,
  selectedCategory,
}) {
  return (
    <>
      {user && <Hero />}
      <div className="home-content">
        <StoryFeed
          posts={posts}
          loading={loading}
          error={error}
          onRetry={onRetry}
          selectedCategory={selectedCategory}
        />
        {user ? (
          <aside className="home-composer">
            <Composer {...composerProps} />
            <section className="note-card">
              <span className="note-spark" aria-hidden="true">✳</span>
              <p>“A writer is someone for whom writing is more difficult than it is for other people.”</p>
              <span className="note-author">— THOMAS MANN</span>
            </section>
          </aside>
        ) : (
          <aside className="home-callout">
            <p className="eyebrow">Your voice belongs here</p>
            <h2>Have a story to tell?</h2>
            <p>Join the community and share something meaningful.</p>
            <Link className="button button-dark hero-button" to="/signup">Create an account <span aria-hidden="true">↗</span></Link>
          </aside>
        )}
      </div>
    </>
  );
}

function AuthorsPage() {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/api/users/authors')
      .then((response) => {
        if (active) setAuthors(response.data.data.authors || []);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryCount]);

  return (
    <main className="authors-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">People behind the stories</p>
          <h1>Our authors</h1>
        </div>
        <span className="story-count">{authors.length.toString().padStart(2, '0')} AUTHORS</span>
      </div>
      {loading && <p className="status-message">Loading authors…</p>}
      {!loading && error && (
        <div className="error-box" role="alert">
          <span>{error}</span>
          <button className="text-button" type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && authors.length === 0 && (
        <div className="empty-state">
          <h2>No authors found</h2>
          <p>Authors will appear here when they join the community.</p>
        </div>
      )}
      {!loading && !error && authors.length > 0 && (
        <div className="author-grid">
          {authors.map((author) => (
            <Link className="author-card" to={`/profile/${author.id}`} key={author.id}>
              <span className="author-card-avatar">
                {author.profilePicture ? (
                  <img
                    src={getImageUrl(author.profilePicture)}
                    alt={`Portrait of ${author.name}`}
                    loading="lazy"
                  />
                ) : (
                  <span aria-hidden="true">{getAuthorInitials(author.name)}</span>
                )}
              </span>
              <span className="author-card-name">{author.name}</span>
              <span className="author-card-username">@{author.username || author.name}</span>
              <span className="author-card-count">
                {author.postCount} {author.postCount === 1 ? 'post' : 'posts'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function ProfilePage({ user, token, onUserUpdated }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const isOwner = Boolean(user && String(user.id || user._id) === id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/api/users/${encodeURIComponent(id)}`),
      api.get('/api/posts', { params: { author: id } }),
    ])
      .then(([profileResponse, postsResponse]) => {
        if (!active) return;
        const nextProfile = profileResponse.data.data.user;
        setProfile(nextProfile);
        setPosts(postsResponse.data.data.posts || []);
        setName(nextProfile.name || '');
        setEmail(isOwner ? user.email || '' : '');
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isOwner, retryCount, user]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const payload = { name, email };
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    setSaving(true);
    try {
      const response = await api.patch(`/api/users/${encodeURIComponent(id)}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile((currentProfile) => ({ ...currentProfile, ...response.data.data.user }));
      onUserUpdated(response.data.data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Your profile has been updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setAvatarError('');
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setAvatarError('The image must be 5 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const response = await api.post('/api/upload', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedUser = response.data.data.user;
      setProfile((currentProfile) => ({ ...currentProfile, ...updatedUser }));
      onUserUpdated(updatedUser);
    } catch (requestError) {
      setAvatarError(getErrorMessage(requestError));
    }
  }

  return (
    <main className="profile-page">
      {loading && <p className="status-message">Loading profile…</p>}
      {!loading && error && !profile && (
        <div className="error-box" role="alert">
          <span>{error}</span>
          <button className="text-button" type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}
      {!loading && profile && (
        <>
          <section className="profile-heading">
            <div className="profile-avatar">
              {profile.profilePicture ? (
                <img src={getImageUrl(profile.profilePicture)} alt={`Portrait of ${profile.name}`} />
              ) : (
                <span aria-hidden="true">{getAuthorInitials(profile.name)}</span>
              )}
            </div>
            <div>
              <p className="eyebrow">{isOwner ? 'Your account' : 'Community author'}</p>
              <h1>{profile.name}</h1>
              {profile.username && <p className="profile-username">@{profile.username}</p>}
              <p className="profile-post-count">
                {profile.postCount || posts.length} {(profile.postCount || posts.length) === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </section>

          {isOwner && (
            <section className="profile-settings panel" aria-labelledby="profile-settings-heading">
              <div className="panel-kicker">
                <span className="panel-icon" aria-hidden="true">✳</span>
                <span>ACCOUNT SETTINGS</span>
              </div>
              <h2 id="profile-settings-heading">Edit your profile</h2>
              <label className="profile-avatar-upload">
                <span>Change profile picture</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Change profile picture"
                  onChange={handleAvatarChange}
                />
              </label>
              {avatarError && <p className="form-error" role="alert">{avatarError}</p>}
              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength="80"
                  required
                />
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <label htmlFor="profile-current-password">Current password <span className="optional-label">REQUIRED TO CHANGE PASSWORD</span></label>
                <input
                  id="profile-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
                <label htmlFor="profile-new-password">New password</label>
                <input
                  id="profile-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength="8"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <label htmlFor="profile-confirm-password">Confirm new password</label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {error && <p className="form-error" role="alert">{error}</p>}
                {message && <p className="form-success" role="status">{message}</p>}
                <button className="button button-dark submit-button" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </section>
          )}

          <section className="profile-posts" aria-labelledby="profile-posts-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{isOwner ? 'Your writing' : 'Stories by this author'}</p>
                <h2 id="profile-posts-heading">{isOwner ? 'My Posts' : 'Posts'}</h2>
              </div>
              <span className="story-count">{posts.length.toString().padStart(2, '0')} STORIES</span>
            </div>
            {posts.length === 0 ? (
              <div className="empty-state">
                <h3>No Posts found</h3>
                <p>{isOwner ? 'Your published stories will appear here.' : 'This author has not published any stories yet.'}</p>
              </div>
            ) : (
              <div className="profile-post-list">
                {posts.map((post) => (
                  <Link className="profile-post-card" to={`/post/${post._id}`} key={post._id}>
                    <span className="profile-post-category">{getPostCategory(post)}</span>
                    <strong>{post.title}</strong>
                    <span>{post.content}</span>
                    <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function CategoryBar({ selectedCategory, onSelect }) {
  return (
    <nav className="category-bar" aria-label="Post categories">
      <span className="category-bar-label">Explore by topic</span>
      <div className="category-bar-list">
        {CATEGORIES.map((category) => (
          <button
            className={`category-button${selectedCategory === category ? ' selected' : ''}`}
            type="button"
            aria-pressed={selectedCategory === category}
            key={category}
            onClick={() => onSelect(selectedCategory === category ? '' : category)}
          >
            {category}
          </button>
        ))}
      </div>
    </nav>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState('');

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const options = selectedCategory
        ? { params: { category: selectedCategory.toLowerCase() } }
        : undefined;
      const response = await api.get('/api/posts', options);
      setPosts(response.data.data.posts);
    } catch (error) {
      setPostsError(getErrorMessage(error));
    } finally {
      setPostsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (location.pathname === '/') {
      loadPosts();
    }
  }, [loadPosts, location.pathname]);

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
        if (active) setUser(response.data.data.user);
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 401) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken('');
          setUser(null);
        } else {
          setAuthError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleAuthSubmit(event, values) {
    event.preventDefault();
    setAuthError('');
    if (values.mode === 'signup') {
      if (values.password !== values.confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
      if (getUtf8ByteLength(values.password) > 72) {
        setAuthError('Password must be no more than 72 bytes.');
        return;
      }
    }

    setAuthSubmitting(true);
    try {
      const endpoint = values.mode === 'signup' ? '/api/users/register' : '/api/users/login';
      let payload = { email: values.email, password: values.password };
      if (values.mode === 'signup') {
        payload = new FormData();
        payload.append('name', values.fullName.trim());
        payload.append('email', values.email);
        payload.append('password', values.password);
        if (values.profilePicture) {
          payload.append('profilePicture', values.profilePicture);
        }
      }
      const response = await api.post(endpoint, payload);
      const { token: nextToken, user: nextUser } = response.data.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      setUser(nextUser);
      setToken(nextToken);
      navigate('/');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setUser(null);
    setPostMessage('');
    setPostError('');
    navigate('/');
  }

  function handleCategorySelect(category) {
    setSelectedCategory(category);
    if (location.pathname !== '/') {
      navigate('/');
    }
  }

  function handleUserUpdated(updatedUser) {
    setUser((currentUser) => ({ ...currentUser, ...updatedUser }));
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

  function handleRemoveImage() {
    setImage(null);
    setImageError('');
    const input = document.getElementById('cover-image');
    if (input) input.value = '';
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
    if (image) formData.append('coverImage', image);

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

  const composerProps = {
    title,
    setTitle,
    content,
    setContent,
    tags,
    setTags,
    image,
    imagePreview,
    onImageChange: handleImageChange,
    onRemoveImage: handleRemoveImage,
    imageError,
    postError,
    postMessage,
    postLoading,
    onSubmit: handleCreatePost,
  };

  return (
    <div className="blog-app">
      <Header user={user} onLogout={handleLogout} />
      {authError && !['/signin', '/signup'].includes(location.pathname) && (
        <div className="global-error" role="alert">
          {authError}
          <button type="button" aria-label="Dismiss error" onClick={() => setAuthError('')}>×</button>
        </div>
      )}
      {authLoading ? (
        <main className="route-loading"><p className="status-message">Checking your session…</p></main>
      ) : (
        <Routes>
          <Route
            path="/"
            element={(
              <HomePage
                user={user}
                posts={posts}
                loading={postsLoading}
                error={postsError}
                onRetry={loadPosts}
                composerProps={composerProps}
                selectedCategory={selectedCategory}
              />
            )}
          />
          <Route path="/authors" element={<AuthorsPage />} />
          <Route
            path="/profile/:id"
            element={<ProfilePage user={user} token={token} onUserUpdated={handleUserUpdated} />}
          />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route
            path="/signin"
            element={<AuthPage mode="login" error={authError} loading={authSubmitting} onSubmit={handleAuthSubmit} />}
          />
          <Route
            path="/signup"
            element={<AuthPage mode="signup" error={authError} loading={authSubmitting} onSubmit={handleAuthSubmit} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
      <CategoryBar selectedCategory={selectedCategory} onSelect={handleCategorySelect} />
      <footer className="site-footer">
        <Brand footer />
        <span>A home for your thoughts.</span>
        <span>© {new Date().getFullYear()} INKLINE</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
