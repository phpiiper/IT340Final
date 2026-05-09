import { Component, signal, OnInit } from '@angular/core';
import {Router} from '@angular/router';
import {Card} from './card';
import {FormGroup, FormControl, Validators, ReactiveFormsModule} from '@angular/forms';
import {MatIcon} from '@angular/material/icon';
import {CardType} from './createPage';
import {environment} from '../src/environments/environment';

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
  imports: [ReactiveFormsModule, MatIcon],
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

    const res = await fetch(`${environment.backend}/api/deck/user`,{
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
    await fetch(`${environment.backend}/api/auth/signOut`,{
      credentials: "include",
    })
    // console.log(await r.json())
    window.location.href = "/"
  }


  copyForm = new FormGroup({
    id: new FormControl('',Validators.required),
    password: new FormControl(''),
  });
  async copyDeckHandler(event: Event){
    event.preventDefault();
    const cf = this.copyForm.value
    await this.copyDeck(cf.id || "", cf.password || "")
  }
  async copyDeck(id: string, password: string){
      try {
        const res = await fetch(`${environment.backend}/api/deck/copy`,{
          method: 'POST',
          credentials: "include",
          headers: {"Content-Type": "application/json" },
          body: JSON.stringify({
              deckID: id,
              password
           }),
        })
        if (!res.ok) { console.error("Copy request failed"); return; }
        const json = await res.json();
        console.log(json)
        if (json.error){ console.log("err copying:",json.message) }
        else {
            this.decks.update(x => [...x, json.deck])
            this.copyForm.setValue({
              id:"", password: ""
            })
        }
      } catch (e){
        console.error(e)
      }
  }

  async exportDeck(id: string){
      try {
        const res = await fetch(`${environment.backend}/api/deck/export`,{
          method: 'POST',
          credentials: "include",
          headers: {"Content-Type": "application/json" },
          body: JSON.stringify({ deckID: id }),
        })
        if (!res.ok) { console.error("Export request failed"); return; }
        const blob = await res.blob();
        this.downloadBlob(blob, `dm-${id}.json`)
      } catch (e){
        console.error(e)
      }
  }

  downloadBlob(blob: Blob, name: string){
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async importFile(event: Event){
      const target = event.target as HTMLInputElement
      if (!target || !target.files || target.files.length === 0) {return;}
      const file = target.files[0]
      if (file.name.split(".").at(-1) !== "json"){
          console.log("incorrect file format!")
          return
      }
      const text = await file.text()
      try {
        const json = JSON.parse(text)
        console.log(json)
        // backend handles logical structure (just ensuring here that json is the only thing sent)
        const res = await fetch(`${environment.backend}/api/deck/import`,{
          method: 'POST',
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({deck: json}),
        })
        if (!res.ok) { console.log("ERR!"); return; }
        const data = await res.json()
        this.decks.update(x => [...x, data.deck])
        target.value = '';
      } catch (e){
        console.log(e)
        console.log("definitely not json!")
        return
      }
  }

  // really here just to delete decks
  async updateDeck(id: string, method: string){
      const deck = this.decks().find(x => x._id === id)
      if (!deck) {return}
      if (!["delete"].includes(method)){return}
      try {
        const res = await fetch(`${environment.backend}/api/deck/update`,{
          method: 'POST',
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({deck, method}),
        })
        if (!res.ok) { console.log("ERR!"); return; }
        const data = await res.json()
        if (data.error){
          console.log("ERR", data.message)
        } else {
          this.decks.update(x => x.filter(y => y._id !== id))
        }
      } catch (e){
        console.log(e)
        console.log("definitely not json!")
        return
      }
  }


}
