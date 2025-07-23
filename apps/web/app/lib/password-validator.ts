/**
 * Password validation utilities
 */

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-4 (4 being strongest)
  errors: string[];
  suggestions: string[];
}

export interface PasswordValidationOptions {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  prohibitCommonPasswords: boolean;
}

// Common weak passwords to check against
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'admin123', 'root', 'toor', 'pass', 'test', 'user',
  'guest', 'demo', 'sample', 'temp', 'changeme', 'default'
]);

export class PasswordValidator {
  private options: PasswordValidationOptions;

  constructor(options: Partial<PasswordValidationOptions> = {}) {
    this.options = {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      prohibitCommonPasswords: true,
      ...options
    };
  }

  /**
   * Validate password strength and requirements
   */
  validate(password: string): PasswordStrengthResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check length
    if (password.length < this.options.minLength) {
      errors.push(`Password must be at least ${this.options.minLength} characters long`);
    } else {
      score += 1;
      if (password.length >= 12) score += 1; // Bonus for longer passwords
    }

    // Check character requirements
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

    if (this.options.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
      score += 0.5;
    }

    if (this.options.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
      score += 0.5;
    }

    if (this.options.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    } else if (hasNumbers) {
      score += 0.5;
    }

    if (this.options.requireSpecialChars && !hasSpecialChars) {
      errors.push('Password must contain at least one special character (!@#$%^&*...)');
    } else if (hasSpecialChars) {
      score += 0.5;
    }

    // Check against common passwords
    if (this.options.prohibitCommonPasswords) {
      const lowercasePassword = password.toLowerCase();
      if (COMMON_PASSWORDS.has(lowercasePassword)) {
        errors.push('Password is too common. Please choose a more unique password');
        score = Math.max(0, score - 2);
      }
    }

    // Check for simple patterns
    if (this.hasSimplePatterns(password)) {
      suggestions.push('Avoid simple patterns like "123456" or "abcdef"');
      score = Math.max(0, score - 1);
    }

    // Check for repeated characters
    if (this.hasRepeatedCharacters(password)) {
      suggestions.push('Avoid repeated characters (e.g., "aaa" or "111")');
      score = Math.max(0, score - 0.5);
    }

    // Provide suggestions for improvement
    if (errors.length === 0) {
      if (score < 3) {
        suggestions.push('Consider making your password longer or more complex');
      }
      if (!hasSpecialChars && this.options.requireSpecialChars) {
        suggestions.push('Adding special characters can improve security');
      }
    }

    // Normalize score to 0-4 range
    score = Math.max(0, Math.min(4, Math.round(score)));

    return {
      isValid: errors.length === 0,
      score,
      errors,
      suggestions
    };
  }

  /**
   * Quick validation for minimum requirements only
   */
  meetsMinimumRequirements(password: string): boolean {
    return this.validate(password).isValid;
  }

  /**
   * Get password strength description
   */
  getStrengthDescription(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check for simple sequential patterns
   */
  private hasSimplePatterns(password: string): boolean {
    // Check for sequential numbers
    if (/123456|234567|345678|456789|567890|098765|987654|876543|765432|654321/.test(password)) {
      return true;
    }

    // Check for sequential letters
    if (/abcdef|bcdefg|cdefgh|defghi|efghij|fedcba|edcbba|dcbabb|cbbaaf/.test(password.toLowerCase())) {
      return true;
    }

    // Check for keyboard patterns
    if (/qwerty|asdfgh|zxcvbn|qwertyuiop|asdfghjkl|zxcvbnm/.test(password.toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * Check for excessive repeated characters
   */
  private hasRepeatedCharacters(password: string): boolean {
    // Check for 3+ consecutive identical characters
    return /(.)\1{2,}/.test(password);
  }
}