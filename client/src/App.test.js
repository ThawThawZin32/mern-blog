import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
}));

const api = axios.create.mock.results[0].value;

beforeEach(() => {
  localStorage.clear();
  api.get.mockReset();
  api.post.mockReset();
  api.get.mockImplementation((url) => Promise.resolve({
    data: {
      success: true,
      data: url === '/api/users/me'
        ? { user: { id: 'user-1', name: 'Test Writer', email: 'writer@example.com' } }
        : { posts: [] },
    },
  }));
});

test('shows the login form and latest stories', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /good stories start with you/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(await screen.findByText(/the first page is yours/i)).toBeInTheDocument();
});

test('logs in and shows the image-enabled create post form', async () => {
  api.post.mockResolvedValueOnce({
    data: {
      success: true,
      data: {
        token: 'test-jwt-token',
        user: { id: 'user-1', name: 'Test Writer', email: 'writer@example.com' },
      },
    },
  });

  render(<App />);
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: 'writer@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^log in/i }));

  expect(await screen.findByRole('heading', { name: /write a story/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/your story/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/add a cover image/i)).toBeInTheDocument();
  expect(localStorage.getItem('mern-blog-token')).toBe('test-jwt-token');
});

test('publishes the new story as multipart form data with the JWT', async () => {
  api.post
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'test-jwt-token',
          user: { id: 'user-1', name: 'Test Writer', email: 'writer@example.com' },
        },
      },
    })
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          post: {
            _id: 'post-1',
            title: 'A new story',
            content: 'Hello from the blog.',
            tags: ['ideas'],
            author: { name: 'Test Writer' },
            createdAt: '2026-11-11T00:00:00.000Z',
          },
        },
      },
    });

  render(<App />);
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: 'writer@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^log in/i }));

  fireEvent.change(await screen.findByLabelText(/title/i), {
    target: { value: 'A new story' },
  });
  fireEvent.change(screen.getByLabelText(/your story/i), {
    target: { value: 'Hello from the blog.' },
  });
  fireEvent.change(screen.getByLabelText(/tags/i), {
    target: { value: 'ideas' },
  });
  fireEvent.click(screen.getByRole('button', { name: /publish story/i }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledTimes(2);
  });
  const [url, formData, options] = api.post.mock.calls[1];
  expect(url).toBe('/api/posts');
  expect(formData).toBeInstanceOf(FormData);
  expect(formData.get('title')).toBe('A new story');
  expect(formData.get('content')).toBe('Hello from the blog.');
  expect(options.headers.Authorization).toBe('Bearer test-jwt-token');
  expect(await screen.findByText(/your post has been published/i)).toBeInTheDocument();
});
