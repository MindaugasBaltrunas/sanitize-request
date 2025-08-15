# Production HTML Sanitization Library

A comprehensive, production-ready HTML sanitization library for Node.js/Express applications with TypeScript support.

```bash
npm install sanitize-request
```

```bash
yarn add sanitize-request
```

```bash
pnpm add sanitize-request
```

## 🛠️ Usage Examples

### 1. Basic Express.js Integration

```typescript
import express from 'express';
import { sanitizeRequest, sanitizeStrings } from 'sanitize-request';

const app = express();
app.use(express.json());

// Apply global sanitization
app.use(sanitizeRequest());

// Or use string sanitization for simple cases
app.use(sanitizeStrings());

app.post('/api/posts', (req, res) => {
  // req.body is now sanitized
  console.log(req.body.content); // HTML tags filtered based on config
  res.json({ success: true });
});
```

### 2. Route-Specific Configurations

```typescript
import { sanitizeRequest, getConfig, createCustomConfig } from 'sanitize-request';

// Blog posts - allow rich HTML
app.use('/api/blog', sanitizeRequest({ 
  config: 'blog',
  logWarnings: true 
}));

// Comments - strict filtering
app.use('/api/comments', sanitizeRequest({ 
  config: 'comment' 
}));

// Admin panel - liberal configuration
app.use('/admin/api', sanitizeRequest({ 
  config: 'admin',
  onSanitized: (metadata) => {
    console.log(`Admin content sanitized:`, metadata);
  }
}));

// Custom configuration
const customConfig = createCustomConfig('base', {
  allowedTags: ['p', 'br', 'strong', 'em'],
  maxStringLength: 1000,
  allowedAttributes: {
    a: ['href']
  }
});

app.use('/api/custom', sanitizeRequest({ config: customConfig }));
```

### 3. Advanced Middleware Configuration

```typescript
app.use('/api', sanitizeRequest({
  config: 'strict',
  skipPaths: ['/api/auth', '/api/upload'], // Skip certain endpoints
  logWarnings: process.env.NODE_ENV === 'development',
  onSanitized: (metadata) => {
    // Log to monitoring service
    logger.info('Content sanitized', {
      sanitized: metadata.sanitized,
      warnings: metadata.warnings,
      fieldsModified: metadata.fieldsModified
    });
  },
  onError: (error, req) => {
    logger.error('Sanitization failed', {
      error: error.message,
      path: req.path,
      method: req.method
    });
  }
}));
```

### 4. Manual Sanitization

```typescript
import { 
  sanitizeString, 
  sanitizeRequestData,
  getConfig,
  SanitizationError
} from 'sanitize-request';

// Sanitize individual strings
try {
  const result = sanitizeString(
    '<script>alert("xss")</script><p>Hello World!</p>',
    getConfig('blog')
  );
  
  console.log(result.data); // "<p>Hello World!</p>"
  console.log(result.sanitized); // true
  console.log(result.warnings); // ["Script tag removed"]
} catch (error) {
  if (error instanceof SanitizationError) {
    console.error('Sanitization failed:', error.message);
  }
}

// Sanitize objects
const userData = {
  name: '<b>John Doe</b>',
  bio: '<script>evil()</script><p>I am a developer</p>',
  email: 'john@example.com' // Won't be sanitized (not HTML)
};

const sanitized = sanitizeRequestData(userData, getConfig('blog'));
console.log(sanitized.data.name); // "<b>John Doe</b>"
console.log(sanitized.data.bio);  // "<p>I am a developer</p>"
```

### 5. Configuration Profiles

```typescript
// Available configurations
const configs = {
  strict: 'Minimal HTML tags only',
  base: 'Basic formatting tags',
  blog: 'Rich content for blog posts',
  comment: 'User comments with limited formatting',
  email: 'Email-safe HTML',
  admin: 'Full HTML access for administrators',
  liberal: 'Most HTML tags allowed'
};

// Profile comparison
const dangerousHtml = `
  <script>alert('xss')</script>
  <p>Hello <strong>World</strong></p>
  <img src="image.jpg" alt="Test">
`;

Object.keys(configs).forEach(configName => {
  const result = sanitizeString(dangerousHtml, getConfig(configName));
  console.log(`${configName}:`, result.data);
});
```

### 6. Custom String Sanitization

```typescript
// Basic string cleaning
app.use(sanitizeStrings({
  customSensitiveFields: ['creditCard', 'ssn'],
  customSanitizer: (value) => {
    return value
      .replace(/[<>"'&]/g, '') // Remove dangerous characters
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  },
  skipEmptyStrings: true
}));
```

### 7. Error Handling and Monitoring

```typescript
import { sanitizeRequest, SanitizationError } from 'sanitize-request';

app.use(sanitizeRequest({
  config: 'blog',
  onError: (error, req) => {
    // Send to error tracking service
    errorTracker.capture(error, {
      request: {
        path: req.path,
        method: req.method,
        body: req.body,
        ip: req.ip
      }
    });
  },
  onSanitized: (metadata) => {
    // Track sanitization metrics
    if (metadata.warnings.length > 0) {
      metrics.increment('sanitization.warnings', {
        warnings: metadata.warnings.length
      });
    }
  }
}));

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof SanitizationError) {
    return res.status(400).json({
      error: 'Invalid content detected',
      field: err.field,
      message: 'Content contains unsafe HTML'
    });
  }
  
  next(err);
});
```

## 🔍 Configuration Reference

### Sanitization Configs

| Config | Use Case | Allowed Tags | Max Length |
|--------|----------|--------------|------------|
| `strict` | User input forms | `b`, `i`, `em`, `strong` | 1,000 |
| `base` | General purpose | Basic formatting | 10,000 |
| `blog` | Blog posts | Rich content | 25,000 |
| `comment` | User comments | Limited formatting | 2,000 |
| `email` | Email content | Email-safe HTML | 5,000 |
| `admin` | Admin interface | Full HTML | 100,000 |
| `liberal` | Flexible content | Most HTML tags | 50,000 |

### Configuration Options

```typescript
interface SanitizationConfig {
  allowedTags?: string[];           // Permitted HTML tags
  allowedAttributes?: Record<string, string[]>; // Attributes per tag
  stripIgnoreTag?: boolean;         // Remove unknown tags
  stripIgnoreTagBody?: boolean;     // Remove content of unknown tags
  allowEmptyTags?: boolean;         // Allow tags without content
  maxTagDepth?: number;             // Maximum nesting depth
  maxStringLength?: number;         // Maximum string length
}
```

### Sensitive Fields (Auto-Protected)

These fields are automatically skipped during sanitization:
- `password`, `confirmPassword`, `passwordConfirm`
- `token`, `accessToken`, `refreshToken`, `jwt`
- `apiKey`, `secret`, `privateKey`
- `sessionId`, `csrfToken`, `authToken`



### 1. Defense in Depth

```typescript
// Multiple layers of protection
app.use(helmet()); // Security headers
app.use(rateLimit()); // Rate limiting
app.use(sanitizeRequest({ config: 'strict' })); // Input sanitization
app.use(validateInput()); // Input validation
```

### 2. Content Security Policy

```typescript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"]
  }
}));
```

### 3. Logging and Monitoring

```typescript
const sanitizationLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'sanitization.log' })
  ]
});

app.use(sanitizeRequest({
  config: 'blog',
  onSanitized: (metadata) => {
    sanitizationLogger.info('Content sanitized', {
      timestamp: new Date().toISOString(),
      fieldsModified: metadata.fieldsModified,
      warnings: metadata.warnings.length,
      originalSize: metadata.originalSize,
      finalSize: metadata.finalSize
    });
  }
}));
```

## 🚀 Performance Optimization

### 1. Caching Configuration

```typescript
// Cache configurations to avoid recreating them
const configCache = new Map();

const getCachedConfig = (name: string) => {
  if (!configCache.has(name)) {
    configCache.set(name, getConfig(name));
  }
  return configCache.get(name);
};
```

### 2. Conditional Sanitization

```typescript
// Only sanitize when necessary
app.use((req, res, next) => {
  const contentType = req.get('Content-Type');
  
  // Skip sanitization for file uploads
  if (contentType?.includes('multipart/form-data')) {
    return next();
  }
  
  // Skip for API endpoints that don't accept HTML
  if (req.path.startsWith('/api/numeric-data')) {
    return next();
  }
  
  sanitizeRequest({ config: 'base' })(req, res, next);
});
```

### 3. Streaming for Large Content

```typescript
import { Transform } from 'stream';

class SanitizeStream extends Transform {
  constructor(private config: SanitizationConfig) {
    super({ objectMode: false });
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    try {
      const sanitized = sanitizeString(chunk.toString(), this.config);
      callback(null, sanitized.data);
    } catch (error) {
      callback(error);
    }
  }
}

// Use for large file processing
app.post('/upload-html', (req, res) => {
  req.pipe(new SanitizeStream(getConfig('liberal')))
     .pipe(fs.createWriteStream('sanitized-output.html'));
});
```

## 📊 Monitoring and Analytics

### 1. Metrics Collection

```typescript
import { createPrometheusMetrics } from 'prom-client';

const sanitizationMetrics = {
  totalRequests: new Counter({
    name: 'sanitization_requests_total',
    help: 'Total number of sanitization requests'
  }),
  sanitizedRequests: new Counter({
    name: 'sanitization_modified_total',
    help: 'Number of requests that were sanitized'
  }),
  warnings: new Counter({
    name: 'sanitization_warnings_total',
    help: 'Total number of sanitization warnings'
  }),
  processingTime: new Histogram({
    name: 'sanitization_duration_seconds',
    help: 'Time spent sanitizing requests'
  })
};

app.use(sanitizeRequest({
  config: 'blog',
  onSanitized: (metadata) => {
    sanitizationMetrics.totalRequests.inc();
    if (metadata.sanitized) {
      sanitizationMetrics.sanitizedRequests.inc();
    }
    sanitizationMetrics.warnings.inc(metadata.warnings.length);
  }
}));
```

### 2. Health Checks

```typescript
app.get('/health/sanitization', (req, res) => {
  try {
    // Test sanitization functionality
    const testResult = sanitizeString('<b>test</b>', getConfig('base'));
    
    res.json({
      status: 'healthy',
      sanitizationWorking: testResult.data === '<b>test</b>',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## 📝 Changelog

### v1.0.0
- Initial production release
- Complete TypeScript support
- Express middleware integration
- Multiple configuration profiles
- Comprehensive error handling
- Performance optimizations
- Security enhancements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Security Issues: mindebaltru@gmail.com