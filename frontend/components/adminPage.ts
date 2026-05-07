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
        console.log(res)
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
    } else {
      this.adminData.set(data)
      this.canAccess.set(true)
      this.lastUpdated.set(new Date().toLocaleTimeString())
      if (Array.isArray(data.logs)) {
        const newLogs = data.logs
        this.logs.set(newLogs)
        this.filteredAPIs.set([...new Set(newLogs.logs.map(x => x.api))])
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
  tab = signal(1);
  setTab(tabIndex: number){
    this.tab.set(tabIndex);
  }
  adminData = signal(null);
  logs = signal<LogType[]>([]);
  filteredAPIs = signal<string[]>([]);
  users = signal<UserType[]>([])
  lastUpdated = signal<string>(new Date().toLocaleTimeString());

  async updateUser(id: string, key: string, value: string){
      this.fetching.set(false)
      if (!id || !key || !value || !["username","password"].includes(key)) {return}
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
      }
    this.fetching.set(true)


  }



}
