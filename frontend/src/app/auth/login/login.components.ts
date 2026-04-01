import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';

@Component({
selector: 'app-login',
standalone: true,
imports: [CommonModule, ReactiveFormsModule], // These are critical!
templateUrl: './login.components.html',
styleUrls: ['./login.components.scss']
})
export class LoginComponent implements OnInit {
loginForm!: FormGroup;
loading = false;
error = '';
apiResponse: any = null; // Property for API test results

constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient // Required for API testing
) { }

ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
    });
    
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
    this.router.navigate(['/']);
    }
}

onSubmit(): void {
    if (this.loginForm.invalid) {
    return;
    }
    
    this.loading = true;
    this.error = '';
    
    const { username, password } = this.loginForm.value;
    
    this.authService.login(username, password)
    .subscribe({
        next: () => {
        this.router.navigate(['/']);
        },
        error: err => {
        this.error = err.error?.message || 'Login failed';
        this.loading = false;
        }
    });
}

// Add testApi method for API testing
testApi(endpoint: 'hello' | 'protected'): void {
    console.log(`Testing ${endpoint} API endpoint`);
    this.apiResponse = null; // Clear previous response
    
    this.http.get(`http://localhost:4200/api/${endpoint}`, {
    withCredentials: true // Important for cookies
    }).subscribe({
    next: (response) => {
        console.log(`${endpoint} API response:`, response);
        this.apiResponse = response;
    },
    error: (error) => {
        console.error(`${endpoint} API error:`, error);
        this.apiResponse = {
        error: true,
        message: error.error?.message || error.statusText || 'Unknown error',
        status: error.status
        };
    }
    });
}
}