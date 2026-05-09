import { Component, signal, OnInit, input, resource, computed } from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {FormGroup, FormControl, Validators, ReactiveFormsModule} from '@angular/forms';
import {environment} from "../src/environments/environment"
import {Log} from "./log";

export interface LogType {
  id: number;
  level: string;
  api: string;
  date: string;
  description: string;
  action: string;
}
export interface UserType {
  _id: string;
  username: string;
  role: string;
  email: string;
}

@Component({
  selector: 'AdminPage',
  imports: [ReactiveFormsModule, Log],
  templateUrl: './adminPage.html',
})
export class AdminPage implements OnInit{
  constructor(private router: Router, private route: ActivatedRoute){}

  ngOnInit(){
    this.fetchAdminData().then(res => {
        // IF admin...
        if (Array.isArray(res.logs)) {
          const newLogs = res.logs
          this.logs.set(newLogs)
        }
        if (Array.isArray(res.users)) {
          const newUsers = res.users
          this.users.set(newUsers)
        }
      })
  }

  async fetchAdminData(){
    this.fetching.set(true);
    const res = await fetch(`${environment.backend}/api/admin/fetch`,{
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "GET"
    });
    const data = await res.json();
    console.log(44,data)
    if (data.error){
      console.log("other err :: ",data.message)
      // assume not logged in (or authed)
      window.location.href = `/`
    } else {
      this.adminData.set(data)
      this.canAccess.set(true)
      this.lastUpdated.set(new Date().toLocaleTimeString())
      if (Array.isArray(data.logs)) {
        const newLogs = data.logs
        this.logs.set(newLogs)
        this.filteredAPIs.set([...new Set(newLogs.map((x: any) => x.api))])
        this.filteredLogs.set(newLogs)
        await this.filterSubmit()
      }
      if (Array.isArray(data.users)) {
        const newUsers = data.users
        this.users.set(newUsers)
      }
    }
    this.fetching.set(false)
    this.loading.set(false)
    return data;
  }
  loading = signal(true);
  fetching = signal(false);
  canAccess = signal(false);
  tab = signal(0);
  setTab(tabIndex: number){
    this.tab.set(tabIndex);
  }
  adminData = signal(null);
  logs = signal<LogType[]>([]);
  filteredAPIs = signal<any[]>([]);
  users = signal<UserType[]>([])
  lastUpdated = signal<string>(new Date().toLocaleTimeString());

  filterForm = new FormGroup({
    level: new FormControl("None", Validators.required),
    describe: new FormControl('f', Validators.required),
    api: new FormControl("None", Validators.required),
  });
  filteredLogs = signal<any[]>([]);
  async filterSubmit(){
    let {level, api} = this.filterForm.value;
    const filteredLogs = this.logs().filter(x => {
        if (x.level !== level && level !== "None") {return false}
        if (x.api !== api && api !== "None") {return false}
        return true
    })
    this.filteredLogs.set(filteredLogs)
  }

  async updateUser(id: string, key: string, value: string){
      this.fetching.set(false)
      console.log(106, id, key, value)
      if (!id || !key || !value || !["username","password","email"].includes(key)) {return {
        error: true, success: false, message: "Missing, or invalid update keys!"
      }}
      const res = await fetch(`${environment.backend}/api/admin/updateUser`,{
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
            id, key, value
        }),
      });
      const data = await res.json();
      if (data.error){
        console.log("ERROR")
        return {error: true, success: false,  message: data.message}
      }
    this.fetching.set(true)
    return {error: false, success: true, message: "User updated successfully."};
  }





  disableUserFormHandler(choice: boolean){
    if (choice){
      this.userForm.get("username")?.disable();
      this.userForm.get("email")?.disable();
      this.userForm.get("password")?.disable();
      this.userFormDisabled.set(true)
    } else {
      this.userForm.get("username")?.enable();
      this.userForm.get("email")?.enable();
      this.userForm.get("password")?.enable();
      this.userFormDisabled.set(false)
    }
  }
  userFormDisabled = signal(true);
  userForm = new FormGroup({
    id: new FormControl({
      value: "None", disabled: true
    }, Validators.required),
    username: new FormControl({
      value: "", disabled: this.userFormDisabled()
    }, Validators.required),
    email: new FormControl({
      value: "", disabled: this.userFormDisabled()
    }, Validators.required),
    password: new FormControl({
      value: "", disabled: this.userFormDisabled()
    }, Validators.required),
  });
  changeUser(event: any){
    const id = typeof event === "object" && event?.target ? (event.target as HTMLInputElement).value : (typeof event === "string" ? event : "");
    if (id !== "None"){
        const user = this.users().find(x => x._id === id);
        if (!user){return;}
        this.userForm.setValue({
          id: id || "N/A",
          username: user.username,
          email: user.email,
          password: ""
        })
        this.disableUserFormHandler(false);
    } else {
      this.userForm.setValue({
        id: id || "None",
        username: "",
        email: "",
        password: ""
      })
      this.disableUserFormHandler(true);
    }
  }
  async updateUserHandler(type: string){
    const userForm = this.userForm.getRawValue();
    let updateAll = type === "all"
    const allowedValues = ["password", "username", "email"] as const;
    this.disableUserFormHandler(true);
    let errorMessages = [];
    let successMessages = [];
    for (let allowed of allowedValues){
        if (type === allowed || updateAll){
          let value = userForm[allowed] || ""
          if (value.length < 3) {
            console.log("LENGTH ERROR")
            continue;
          }
          const {error, message} = await this.updateUser(userForm.id || "", allowed, userForm[allowed] || "")
          if (error) {
            errorMessages.push(message)
          } else {
            successMessages.push(message)
            this.users.update((users:any) => {
              return users.map((x: any)=> {
                if (x._id !== userForm.id) {
                  return x
                }
                return {...x, [allowed]: userForm[allowed]}
              })
            })
          }

        }
    }
    this.handleUserUpdateMessages(errorMessages, successMessages);
    this.disableUserFormHandler(false);
  }

  handleUserUpdateMessages(errorMessages:string[], successMessages:string[]){
      let updateError = false;
      let updateErrorString = ""
      let updateSuccessString = ""
      if (errorMessages.length > 0) {
          updateError = true;
          updateErrorString = errorMessages.join(", ");
      }
      if (successMessages.length > 0) {
        updateSuccessString = successMessages.join(", ");
      }

     // console.log(updateError, updateErrorString, updateSuccessString);
  }

}
