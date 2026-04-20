import { Component, signal, OnInit } from '@angular/core';
import {Router} from '@angular/router';
import {Card} from './card';
import {FormGroup, FormControl, Validators, ReactiveFormsModule} from '@angular/forms';
import {MatIcon} from '@angular/material/icon';
import {CardType} from './createPage';

export interface DeckType {
  _id: string;
  author: string;
  cards: CardType[];
  maxCards: number;
  name: string;
  tags: string[];
}

@Component({
  selector: 'DecksPage',
  imports: [Card, ReactiveFormsModule, MatIcon],
  templateUrl: './decksPage.html',
})
export class DecksPage implements OnInit{
  constructor(private router: Router){}
  loading = signal(true);
  decks = signal<DeckType[]>([])

  ngOnInit(){
    this.fetchDecks().then(res => {
        console.log(res)
      })
    }

  async fetchDecks(){
    this.loading.set(true);

    const res = await fetch("http://localhost:3000/api/deck/user",{
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    console.log(32, data)
    if (data.error){
        console.log("other err :: ",data.message)
    } else {
      this.decks.set(data.decks)
      console.log(data.decks)
    }
    this.loading.set(false)
    return data;
  }

  async goToDeck(id: String){
    console.log("GO TO ::",id)
    await this.router.navigate(['/deck', id])
  }
  searchForm = new FormGroup({
    id: new FormControl('',Validators.required),
  });
  async search(){
    const searchObj = this.searchForm.value;
    const id = searchObj.id;
    const idRegex = /^[a-f\d]{24}$/
    // 69e031335cc6e90b53937bd3
    if (idRegex.test(<string>id)){
      await this.goToDeck(<string>id)
    } else {
      this.searchError.set(true)
      this.searchErrorMessage.set("Invalid Deck ID format!")
    }
  }
  searchError = signal(false)
  searchErrorMessage = signal("")


  async logout(){
    const r = await fetch("http://localhost:3000/api/auth/signOut",{
      credentials: "include",
    })
    // console.log(await r.json())
    window.location.href = "/"
  }



}
