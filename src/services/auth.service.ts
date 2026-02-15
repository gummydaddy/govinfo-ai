// src/services/auth.service.ts

import { Injectable, inject } from '@angular/core';
import { StateService } from './state.services.js';
import { User } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private stateService = inject(StateService);
  
  // Default super admin credentials
  private readonly SUPER_ADMIN = {
    email: 'admin@govinfo.ai',
    password: 'GovInfoAdmin@2024',
    name: 'System Administrator',
    role: 'admin' as const
  };
  
  /**
   * Register a new user
   */
  signup(email: string, password: string, name: string): { success: boolean; message: string; user?: User } {
    // Validate inputs
    if (!email || !password || !name) {
      return { success: false, message: 'All fields are required' };
    }
    
    if (!this.isValidEmail(email)) {
      return { success: false, message: 'Invalid email format' };
    }
    
    if (password.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters' };
    }
    
    // Check if super admin email
    if (email.toLowerCase() === this.SUPER_ADMIN.email.toLowerCase()) {
      return { success: false, message: 'This email is reserved for system administrator' };
    }
    
    // Check if user already exists
    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'User with this email already exists' };
    }
    
    // Create new user
    const newUser: User = {
      id: this.generateUserId(),
      email: email.toLowerCase(),
      name,
      role: 'user', // Regular users get 'user' role
      createdAt: new Date().toISOString()
    };
    
    // Save user
    users.push(newUser);
    localStorage.setItem('govinfo_users', JSON.stringify(users));
    
    // Hash and save password (in production, use bcrypt on backend)
    const passwords = this.getPasswords();
    passwords[newUser.id] = this.simpleHash(password);
    localStorage.setItem('govinfo_passwords', JSON.stringify(passwords));
    
    // Auto-login
    this.stateService.setCurrentUser(newUser);
    
    this.stateService.addNotification({
      type: 'success',
      message: `Welcome, ${name}! Your account has been created.`,
      duration: 5000
    });
    
    return { success: true, message: 'Account created successfully', user: newUser };
  }
  
  /**
   * Login user
   */
  login(email: string, password: string): { success: boolean; message: string; user?: User } {
    // Validate inputs
    if (!email || !password) {
      return { success: false, message: 'Email and password are required' };
    }
    
    const emailLower = email.toLowerCase();
    
    // Check if super admin
    if (emailLower === this.SUPER_ADMIN.email.toLowerCase()) {
      if (password === this.SUPER_ADMIN.password) {
        const adminUser: User = {
          id: 'super-admin',
          email: this.SUPER_ADMIN.email,
          name: this.SUPER_ADMIN.name,
          role: 'admin',
          createdAt: new Date('2024-01-01').toISOString()
        };
        
        this.stateService.setCurrentUser(adminUser);
        
        this.stateService.addNotification({
          type: 'success',
          message: `Welcome back, ${adminUser.name}!`,
          duration: 3000
        });
        
        return { success: true, message: 'Login successful', user: adminUser };
      } else {
        return { success: false, message: 'Incorrect password' };
      }
    }
    
    // Check regular users
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === emailLower);
    
    if (!user) {
      return { success: false, message: 'User not found. Please sign up first.' };
    }
    
    // Verify password
    const passwords = this.getPasswords();
    const storedHash = passwords[user.id];
    
    if (!storedHash || storedHash !== this.simpleHash(password)) {
      return { success: false, message: 'Incorrect password' };
    }
    
    // Login successful
    this.stateService.setCurrentUser(user);
    
    this.stateService.addNotification({
      type: 'success',
      message: `Welcome back, ${user.name}!`,
      duration: 3000
    });
    
    return { success: true, message: 'Login successful', user };
  }
  
  /**
   * Logout current user
   */
  logout() {
    const currentUser = this.stateService.currentUser();
    
    this.stateService.setCurrentUser(null);
    this.stateService.clearChat();
    this.stateService.setView('landing');
    
    this.stateService.addNotification({
      type: 'info',
      message: `Goodbye, ${currentUser?.name || 'User'}!`,
      duration: 3000
    });
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.stateService.currentUser() !== null;
  }
  
  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.stateService.currentUser()?.role === 'admin';
  }
  
  /**
   * Change password
   */
  changePassword(oldPassword: string, newPassword: string): { success: boolean; message: string } {
    const currentUser = this.stateService.currentUser();
    
    if (!currentUser) {
      return { success: false, message: 'Not authenticated' };
    }
    
    if (newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters' };
    }
    
    // Admin cannot change password through this method
    if (currentUser.role === 'admin' && currentUser.id === 'super-admin') {
      return { success: false, message: 'Super admin password cannot be changed' };
    }
    
    // Verify old password
    const passwords = this.getPasswords();
    const storedHash = passwords[currentUser.id];
    
    if (!storedHash || storedHash !== this.simpleHash(oldPassword)) {
      return { success: false, message: 'Incorrect current password' };
    }
    
    // Update password
    passwords[currentUser.id] = this.simpleHash(newPassword);
    localStorage.setItem('govinfo_passwords', JSON.stringify(passwords));
    
    this.stateService.addNotification({
      type: 'success',
      message: 'Password changed successfully',
      duration: 3000
    });
    
    return { success: true, message: 'Password changed successfully' };
  }
  
  /**
   * Delete user account
   */
  deleteAccount(password: string): { success: boolean; message: string } {
    const currentUser = this.stateService.currentUser();
    
    if (!currentUser) {
      return { success: false, message: 'Not authenticated' };
    }
    
    // Admin cannot be deleted
    if (currentUser.role === 'admin') {
      return { success: false, message: 'Admin account cannot be deleted' };
    }
    
    // Verify password
    const passwords = this.getPasswords();
    const storedHash = passwords[currentUser.id];
    
    if (!storedHash || storedHash !== this.simpleHash(password)) {
      return { success: false, message: 'Incorrect password' };
    }
    
    // Delete user
    const users = this.getUsers();
    const updatedUsers = users.filter(u => u.id !== currentUser.id);
    localStorage.setItem('govinfo_users', JSON.stringify(updatedUsers));
    
    // Delete password
    delete passwords[currentUser.id];
    localStorage.setItem('govinfo_passwords', JSON.stringify(passwords));
    
    // Logout
    this.logout();
    
    this.stateService.addNotification({
      type: 'info',
      message: 'Account deleted successfully',
      duration: 3000
    });
    
    return { success: true, message: 'Account deleted successfully' };
  }

  private getUsers(): User[] {
    const usersStr = localStorage.getItem('govinfo_users');
    if (!usersStr) return [];
  
    try {
      return JSON.parse(usersStr) as User[];
    } catch (e) {
      console.error('Failed to parse users', e);
      return [];
    }
  }

  getAllUsers(): User[] {
    return this.getUsers();
  }
  
  
  
  // ========== PRIVATE METHODS ==========
  /*
  getUsers(): User[] {
    const usersStr = localStorage.getItem('govinfo_users');
    if (!usersStr) return [];
    
    try {
      return JSON.parse(usersStr);
    } catch (e) {
      console.error('Failed to parse users', e);
      return [];
    }
  }*/

  
  private getPasswords(): { [userId: string]: string } {
    const passwordsStr = localStorage.getItem('govinfo_passwords');
    if (!passwordsStr) return {};
    
    try {
      return JSON.parse(passwordsStr);
    } catch (e) {
      console.error('Failed to parse passwords', e);
      return {};
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private generateUserId(): string {
    return 'user-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
  
  /**
   * Simple hash function for demo purposes
   * IN PRODUCTION: Use bcrypt or similar on backend
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // Create admin user directly
  createAdminUser(name: string, email: string, password: string): { success: boolean; error?: string } {
    const users = this.getAllUsers();
  
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'User already exists' };
    }

    const newUser: User = {
      id: this.generateUserId(),
      name,
      email,
      //password: this.simpleHash(password),
      role: 'admin', // Always create as admin
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('govinfo_users', JSON.stringify(users));

    // Save password hash (CRITICAL - was missing!)
    const passwords = this.getPasswords();
    passwords[newUser.id] = this.simpleHash(password);
    localStorage.setItem('govinfo_passwords', JSON.stringify(passwords));

    return { success: true };
  }

  // Delete user
  deleteUser(userId: string): void {
    const users = this.getAllUsers();
    const filtered = users.filter(u => u.id !== userId);
    localStorage.setItem('govinfo_users', JSON.stringify(filtered));
  }  


}
