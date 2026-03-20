#!/usr/bin/env python3
import os

def update_projects_action():
    """Update src/actions/projects.ts with field-level error handling"""
    filepath = 'src/actions/projects.ts'
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix createProject error handling
    content = content.replace(
        '    return { success: false, error: "Failed to create project" };',
        '''    if (error instanceof ZodError) {
      const fieldErrors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return { success: false as const, error: "Validatiefout", fieldErrors };
    }
    return { success: false as const, error: "Project aanmaken mislukt" };'''
    )
    
    # Fix return success
    content = content.replace(
        '    return { success: true, project };',
        '    return { success: true as const, project };'
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ Updated projects.ts")

def update_communication_action():
    """Update src/actions/communication.ts with field-level error handling"""
    filepath = 'src/actions/communication.ts'
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Add ZodError import if not present
        if 'import { ZodError }' not in content:
            content = content.replace(
                'import { Communication, CommunicationType } from "@prisma/client";',
                'import { Communication, CommunicationType } from "@prisma/client";\nimport { ZodError } from "zod";'
            )
        
        # Update error handling
        content = content.replace(
            '    return { success: false, error: "Failed to create communication entry" };',
            '''    if (error instanceof ZodError) {
      const fieldErrors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return { success: false as const, error: "Validatiefout", fieldErrors };
    }
    return { success: false as const, error: "Communicatie aanmaken mislukt" };'''
        )
        
        content = content.replace(
            '    return { success: true };',
            '    return { success: true as const };'
        )
        
        with open(filepath, 'w') as f:
            f.write(content)
        print("✓ Updated communication.ts")

if __name__ == '__main__':
    os.chdir('/Users/stijnvandepol/Documents/GitHub/ticket-system')
    update_projects_action()
    update_communication_action()
    print("\nAll actions updated with field-level error handling!")
