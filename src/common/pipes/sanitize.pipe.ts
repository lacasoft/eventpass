import { PipeTransform, Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any) {
    if (this.isObject(value)) {
      return this.sanitizeObject(value);
    }
    return value;
  }

  private isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  private sanitizeObject(obj: any): any {
    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizeHtml(sanitized[key], {
          allowedTags: [],
          allowedAttributes: {},
        }).trim();
      } else if (this.isObject(sanitized[key])) {
        sanitized[key] = this.sanitizeObject(sanitized[key]);
      } else if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item) =>
          typeof item === 'string' ? sanitizeHtml(item).trim() : item,
        );
      }
    }

    return sanitized;
  }
}
