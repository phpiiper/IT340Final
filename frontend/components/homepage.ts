import { Component, signal, input, resource } from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Card, CardPopup} from './card';


// <CARD>
@Component({
  selector: 'homepage',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatInputModule, MatTabsModule, ReactiveFormsModule,MatExpansionModule,Card, CardPopup],
  templateUrl: './homepage.html',
})
export class HomePage {


  loginTab = signal(0);
  swapTab = (tab: number) => this.loginTab.set(tab);
  isLoggedIn = signal(false);
  loginHandler() {
      const signinObj = this.profileForm.value;
    console.log('Log in clicked');
    console.log(this.profileForm.value)

    this.isLoggedIn.set(true);
    this.user.update(prev => ({
      ...prev, username: signinObj.username || ""
    }))
  }
  user = signal({
    username: 'Guest',
    email: '<EMAIL>'
  });
  profileForm = new FormGroup({
    username: new FormControl('username', Validators.required),
    password: new FormControl('pw', Validators.required),
  });

}
