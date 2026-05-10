import { Component, signal, OnInit, input, resource } from '@angular/core';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {environment} from '../src/environments/environment';



@Component({
  selector: 'LoginPage',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatInputModule, MatTabsModule, ReactiveFormsModule,MatExpansionModule],
  templateUrl: './loginpage.html',
})
export class LoginPage implements OnInit{
  constructor(private router: Router){}

  ngOnInit(){
    this.fetchUser().then(res => {
        if (res.verify){
          this.router.navigate(['/create'])
        } else {
          console.log("LOGIN!")
        }
    })
  }

  tab = signal(0);
  swapTab = (tab: number) => this.tab.set(tab);
  loginError = signal("");

  async loginPageHandler(tab: number) {
    const signInObj = this.profileForm.value;
    if (tab === 0){
      // LOG IN
      this.disableUserFormHandler(true)
      const res = await fetch(`${environment.backend}/api/auth/login`,{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signInObj.email,
          password: signInObj.password,
        }),
        credentials: "include",
      });
      const js = await res.json();
      if (js.success){
        // await this.router.navigate(['/create'])
        console.log("SUCCESS! go to verify code screen")
        this.tab.set(2)
      } else {
        console.log("Error: ", js.message)
      }
      this.disableUserFormHandler(false)
      return
    } else if (tab === 1){
      // SIGN UP
      console.log("SIGN UP",signInObj)
      this.disableUserFormHandler(true)
      const res = await fetch(`${environment.backend}/api/auth/register`,{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(signInObj)
      });
      const data = await res.json();
      if (data.success){
        console.log("Success!",data)
        this.signUpError.update(prev => ({
          ...prev, message: "Account created!"
        }))
        this.tab.set(0)
      } else {
        console.log("Error!", data)
        this.signUpError.update(prev => ({
          ...prev, error: true, message: data.message
        }))
      }
      this.disableUserFormHandler(false)
      return
    }
  }
  profileForm = new FormGroup({
    username: new FormControl('phpiiper', Validators.required),
    password: new FormControl('@Spirit39s', Validators.required),
    email: new FormControl('plp@njit.edu', Validators.required),
  });
  async fetchUser(){
    const res = await fetch(`${environment.backend}/api/auth/checkLogin`,{
      credentials: "include",
    });
    return await res.json();
  }
  signUpError = signal({
    error: false, message: ""
  });


  // VERIFY
  verifyForm = new FormGroup({
    code: new FormControl('', Validators.required),
    // 642AA8
  });
  async verifyHandler(event: Event){
    event.preventDefault();
    const code = this.verifyForm.value.code
    const {email, password} = this.profileForm.value
    const res = await fetch(`${environment.backend}/api/auth/verify`,{
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify({
          code, email , password
      })
    });
    if (!res.ok){return console.log("Error: ", res)}
    const d = await res.json();
    if (d.error) {return console.log("ERR: ",d.message)}
    console.log("VERIFIED!")
    await this.router.navigate(['/create'])
  }

  profileFormDisabled = signal(false);
  disableUserFormHandler(choice: boolean){
    if (choice){
      this.profileForm.get("username")?.disable();
      this.profileForm.get("email")?.disable();
      this.profileForm.get("password")?.disable();
      this.profileFormDisabled.set(true)
    } else {
      this.profileForm.get("username")?.enable();
      this.profileForm.get("email")?.enable();
      this.profileForm.get("password")?.enable();
      this.profileFormDisabled.set(false)
    }
  }

}
