import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceTag } from './PriceTag';

describe('PriceTag (web)', () => {
  it('shows the price, struck-through original, and discount badge', () => {
    render(<PriceTag originalMinor={2000} priceMinor={500} currency="EUR" />);
    expect(screen.getByText('€5.00')).toBeInTheDocument();
    expect(screen.getByText('€20.00')).toBeInTheDocument();
    expect(screen.getByText('-75%')).toBeInTheDocument();
  });

  it('hides the original and badge when there is no discount', () => {
    render(<PriceTag originalMinor={500} priceMinor={500} currency="EUR" />);
    expect(screen.getByText('€5.00')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
