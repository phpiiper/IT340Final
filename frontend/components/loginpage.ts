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
        console.log(res)
    })
  }

  tab = signal(0);
  swapTab = (tab: number) => this.tab.set(tab);

  async loginPageHandler(tab: number) {
    const signInObj = this.profileForm.value;
    if (tab === 0){
      // LOG IN
      const res = await fetch("http://localhost:3000/api/auth/login",{
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
        await this.router.navigate(['/create'])
      } else {
        console.log("WRONG PASSWORD!")
      }
      return
    } else if (tab === 1){
      // SIGN UP
      console.log("SIGN UP",signInObj)
      const res = await fetch("http://localhost:3000/api/auth/register",{
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
      return
    }
  }
  profileForm = new FormGroup({
    username: new FormControl('username', Validators.required),
    password: new FormControl('password', Validators.required),
    email: new FormControl('email@email.com', Validators.required),
  });
  async fetchUser(){
    const res = await fetch("http://localhost:3000/api/auth/checkLogin",{
      credentials: "include",
    });
    return await res.json();
  }
  signUpError = signal({
    error: false, message: ""
  });

}
