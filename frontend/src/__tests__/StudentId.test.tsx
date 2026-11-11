/**
 * StudentId.test.tsx
 *
 * Unit tests for the student ID validation logic and Header component behaviour.
 * Tests cover:
 *   1. Valid 17-digit student ID passes regex validation.
 *   2. IDs shorter or longer than 17 digits fail validation.
 *   3. IDs containing non-numeric characters fail validation.
 *   4. Header renders with a "valid" badge (data-testid) when ID is correct.
 *   5. Header renders with an "empty" badge when ID is missing.
 *   6. Header renders with an "invalid" badge when ID is incomplete.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/Header';

/** Mirrors the validation regex used across the app. */
const STUDENT_ID_REGEX = /^\d{17}$/;

/** Helper — returns true when the given value is a valid student ID. */
function isValidStudentId(id: string): boolean {
  return STUDENT_ID_REGEX.test(id.trim());
}

// ---------------------------------------------------------------------------
// Test suite 1: Pure validation logic
// ---------------------------------------------------------------------------
describe('Student ID Validation Logic', () => {
  it('should accept a valid 17-digit numeric ID', () => {
    expect(isValidStudentId('12345678901234567')).toBe(true);
    expect(isValidStudentId('00000000000000000')).toBe(true);
    expect(isValidStudentId('99999999999999999')).toBe(true);
  });

  it('should reject an ID shorter than 17 digits', () => {
    expect(isValidStudentId('1234567890123456')).toBe(false);  // 16 digits
    expect(isValidStudentId('123456789012345')).toBe(false);   // 15 digits
    expect(isValidStudentId('')).toBe(false);                  // empty string
  });

  it('should reject an ID longer than 17 digits', () => {
    expect(isValidStudentId('123456789012345678')).toBe(false); // 18 digits
    expect(isValidStudentId('1234567890123456789')).toBe(false);// 19 digits
  });

  it('should reject IDs containing letters or special characters', () => {
    expect(isValidStudentId('1234567890123456a')).toBe(false);
    expect(isValidStudentId('1234567890 234567')).toBe(false); // space inside
    expect(isValidStudentId('1234567890-234567')).toBe(false); // hyphen
  });

  it('should trim surrounding whitespace before validating', () => {
    // The function trims, so a 17-digit ID with surrounding spaces should pass.
    expect(isValidStudentId('  12345678901234567  ')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test suite 2: Header component rendering
// Use data-testid attributes on badge spans for reliable element lookup.
// ---------------------------------------------------------------------------
describe('Header Component — Student ID Badge', () => {
  it('shows the valid badge (data-testid="student-id-badge-valid") for a correct 17-digit ID', () => {
    render(
      <Header
        studentId="12345678901234567"
        onStudentIdChange={() => undefined}
      />
    );

    // Only the "valid" badge should be present; "empty" and "invalid" must not exist.
    expect(screen.getByTestId('student-id-badge-valid')).toBeInTheDocument();
    expect(screen.queryByTestId('student-id-badge-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('student-id-badge-invalid')).not.toBeInTheDocument();
  });

  it('shows the empty badge (data-testid="student-id-badge-empty") when student ID is blank', () => {
    render(
      <Header
        studentId=""
        onStudentIdChange={() => undefined}
      />
    );

    expect(screen.getByTestId('student-id-badge-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('student-id-badge-valid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('student-id-badge-invalid')).not.toBeInTheDocument();
  });

  it('shows the invalid badge (data-testid="student-id-badge-invalid") when ID has fewer than 17 digits', () => {
    render(
      <Header
        studentId="12345"
        onStudentIdChange={() => undefined}
      />
    );

    expect(screen.getByTestId('student-id-badge-invalid')).toBeInTheDocument();
    expect(screen.queryByTestId('student-id-badge-valid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('student-id-badge-empty')).not.toBeInTheDocument();
  });
});
