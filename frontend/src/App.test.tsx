import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders MarketForge Pro heading', () => {
    render(<App />);
    const headingElement = screen.getByText(/MarketForge-Pro/i);
    expect(headingElement).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
