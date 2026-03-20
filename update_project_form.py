#!/usr/bin/env python3
import os

def update_project_form_inputs():
    """Update input fields in create-project-form.tsx to show field errors"""
    filepath = 'src/app/(dashboard)/projects/new/create-project-form.tsx'
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Update project name input
    content = content.replace(
        '''              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Nieuwe website voor Acme"
              />
            </div>

            <div>
              <label htmlFor="clientId" className="form-label">''',
        '''              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className={`form-input ${getFieldError('name') ? 'border-red-500 bg-red-50' : ''}`}
                placeholder="Nieuwe website voor Acme"
              />
              {getFieldError('name') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
              )}
            </div>

            <div>
              <label htmlFor="clientId" className="form-label">'''
    )
    
    # Update clientId select
    content = content.replace(
        '''              <select
                id="clientId"
                name="clientId"
                required
                value={form.clientId}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Selecteer een klant...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="projectType" className="form-label">''',
        '''              <select
                id="clientId"
                name="clientId"
                required
                value={form.clientId}
                onChange={handleChange}
                className={`form-input ${getFieldError('clientId') ? 'border-red-500 bg-red-50' : ''}`}
              >
                <option value="">Selecteer een klant...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
              {getFieldError('clientId') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('clientId')}</p>
              )}
            </div>

            <div>
              <label htmlFor="projectType" className="form-label">'''
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ Updated create-project-form.tsx key input fields")

if __name__ == '__main__':
    os.chdir('/Users/stijnvandepol/Documents/GitHub/ticket-system')
    update_project_form_inputs()
