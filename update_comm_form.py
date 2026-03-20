#!/usr/bin/env python3
import os

def update_communication_form():
    """Update communication form with error field handling"""
    filepath = 'src/components/communication/communication-form.tsx'
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Update subject input
    content = content.replace(
        '''        <input
          id="comm-subject"
          name="subject"
          type="text"
          required
          value={form.subject}
          onChange={handleChange}
          className="form-input"
          placeholder="Waar ging deze communicatie over?"
        />
      </div>''',
        '''        <input
          id="comm-subject"
          name="subject"
          type="text"
          required
          value={form.subject}
          onChange={handleChange}
          className={`form-input ${getFieldError('subject') ? 'border-red-500 bg-red-50' : ''}`}
          placeholder="Waar ging deze communicatie over?"
        />
        {getFieldError('subject') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('subject')}</p>
        )}
      </div>'''
    )
    
    # Update content textarea
    content = content.replace(
        '''        <textarea
          id="comm-content"
          name="content"
          rows={4}
          value={form.content}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Notities van dit gesprek, email inhoud, enz..."
        />
      </div>''',
        '''        <textarea
          id="comm-content"
          name="content"
          rows={4}
          value={form.content}
          onChange={handleChange}
          className={`form-textarea ${getFieldError('content') ? 'border-red-500 bg-red-50' : ''}`}
          placeholder="Notities van dit gesprek, email inhoud, enz..."
        />
        {getFieldError('content') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('content')}</p>
        )}
      </div>'''
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ Updated communication-form.tsx")

if __name__ == '__main__':
    os.chdir('/Users/stijnvandepol/Documents/GitHub/ticket-system')
    update_communication_form()
