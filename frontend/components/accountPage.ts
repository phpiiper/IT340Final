import { Component, signal, input, resource } from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {environment} from '../src/environments/environment';


export interface UserType {
  id: string;
  username: string;
  email: string;
  password: string;
}

@Component({
  selector: 'accountpage',
  imports: [ReactiveFormsModule],
  templateUrl: './accountPage.html',
})
export class AccountPage {
  ngOnInit(){
    this.fetchUser().then(r => {})
  }
  fetching = signal(false);
  loggedIn = signal(false)
  user = signal<UserType | null>(null);
  profileForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    email: new FormControl('', Validators.required),
    id: new FormControl({
      value: "", disabled: true
    }, Validators.required),
  });

  async fetchUser(){
    this.fetching.set(true);
    try {
      const res = await fetch(`${environment.backend}/api/user/auth`, {
        credentials: "include",
        headers: {"Content-Type": "application/json"},
        method: "GET"
      });
      const json = await res.json();
      if (json && json.success) {
          this.loggedIn.set(true)
          const user = json.userInfo
          this.user.set(user)
          this.profileForm.setValue({
            id: user._id,
            username: user.username,
            email: user.email,
            password: ""
          })
      }
    } catch(err) {
      console.log(err)
    }
    this.fetching.set(false);
  }

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
  profileFormDisabled = signal(true);


  async updateUser(id:string, key: string, value: string){
    if (!key || !value || !["username","password","email"].includes(key)) {return {
      error: true, success: false, message: "Missing, or invalid update keys!"
    }}
    this.fetching.set(true)
    this.disableUserFormHandler(true)
    const res = await fetch(`${environment.backend}/api/user/update`,{
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ id, key, value }),
    });
    const data = await res.json();
    if (data.error){
      console.log("ERROR")
      return {error: true, success: false,  message: data.message}
    }
    this.fetching.set(false)
    this.disableUserFormHandler(false)
    return {error: false, success: true, message: "User updated successfully."};
  }

  async updateUserHandler(type: string){
    const profileForm = this.profileForm.getRawValue();
    const allowedValues = ["password", "username", "email"] as const;
    for (const key of allowedValues){
      if (type === key){
          let value = profileForm[key];
          if (typeof value !== "string"){break}
          if (value.length < 3) {break}
          const {error, message} = await this.updateUser(profileForm.id || "", key, profileForm[key] || "")
          if (error) {
            console.log("ERR",message)
            // when error, revert to last known changes
            const lastUser = this.user();
            if (lastUser !== null) {
              this.profileForm.setValue({
                id: lastUser.id || "",
                username: lastUser.username || "",
                email: lastUser.email || "",
                password: ""
              })
            }
          } else {
            console.log("SUCCESS")
            this.user.update((user:any) => {
                return {...user, [key]: profileForm[key]}
              })
          }
      }
    }
  }



}
