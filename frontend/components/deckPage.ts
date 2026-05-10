import { Component, signal, OnInit, resource } from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {Card} from './card';
import {FormGroup, FormControl, Validators, ReactiveFormsModule} from '@angular/forms';
import {CardType} from './createPage';
import {environment} from "../src/environments/environment"

export interface DeckType {
  _id: string;
  author: string;
  cards: CardType[];
  maxCards: number;
  name: string;
  tags: string[];
}

@Component({
  selector: 'CreatePage',
  imports: [Card, ReactiveFormsModule],
  templateUrl: './deckPage.html',
})
export class DeckPage implements OnInit{
  constructor(private router: Router, private route: ActivatedRoute){}

  ngOnInit(){
    this.fetchDeck().then(res => {
        console.log(res)
      })
    }

  async fetchDeck(){
    this.loading.set(true);
    const res = await fetch(`${environment.backend}/api/deck`,{
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        id: this.route.snapshot.paramMap.get("id"),
        password: this.passwordForm.value.password || ""
      })
    });
    const data = await res.json();
    console.log(44,data)
    if (data.error){
      console.log(data.message)
      if (data.message === "Password required!"){
        this.passwordRequired.set(true)
      } else {
        console.log("other err :: ",data.message)
      }
    } else {
      if (data.deck){
        if (data.isOwner) { this.canEdit.set(true) }
        this.deck.set(data.deck)
        this.deckUnlocked.set(true)
        this.editDeckForm.setValue({
            name: data.deck.name || "",
            tags: data.deck.tags.join(","),
            type: data.deck.type || "Private",
            password: data.deck.password || ""
        })
      }
    }
    this.loading.set(false)
    return data;
  }
  password = signal("");
  passwordRequired = signal(false);

  loading = signal(true);
  deck = signal<any>(null)
  deckUnlocked = signal(false)
  canEdit = signal(false)

  cards = resource({
    loader: async ()=>{
      try {
        const res = await fetch(`${environment.backend}/api/cards?&itemsPerPage=351`);
        const data = await res.json();
        return data?.cards || []
      } catch (e){
        console.log(e)
        return []
      }
    }
  })

  isLoading = signal(false);

  passwordForm = new FormGroup({
    password: new FormControl('', Validators.required),
  });
  async sendPassword(){
      this.isLoading.set(true);
      await this.fetchDeck()
      this.isLoading.set(false);
  }

  disableButtons = signal(false)
  async exportDeck(){
    try {
      this.disableButtons.set(true)
      const id = this.route.snapshot.paramMap.get("id")
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
    } finally {
      this.disableButtons.set(false)
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
  async copyDeck(){
    try {
      this.disableButtons.set(true)
      const id = this.route.snapshot.paramMap.get("id")
      let urlString = `/decks?copy=${id}`
      if (this.passwordRequired()){ urlString += `&&password=${this.passwordForm.value.password}` }

      window.location.href = urlString
    } catch (e){
      console.error(e)
    } finally {
      this.disableButtons.set(false)
    }
  }
  editingDeck = signal(false)
  editDeck(state: boolean){
      this.disableButtons.set(state)
      this.editingDeck.set(state)
  }
  closeEditDeck(event: Event){
    const ev = event.target as HTMLInputElement;
      if (!ev || !ev.id){return}
      if (ev.id === "edit-deck-popup"){
        this.editDeck(false)
      }
  }
  editDeckTab = signal("Cards")
  toggleEditDeckTab(event: Event){
    const parent = event.currentTarget as HTMLInputElement;
    const current = event.target as HTMLInputElement;
    if (!parent || !current || parent === current){return}
    const options = Array.from(parent.childNodes).map(x => x.textContent);
    if (options.length <= 1){return}
    if (options.find(x => current.textContent)){
        this.editDeckTab.set(current.textContent)
    }
  }
  editDeckForm = new FormGroup({
    name: new FormControl('oldpw', Validators.required),
    tags: new FormControl(''),
    type: new FormControl('', Validators.required),
    password: new FormControl(''),
  });
  card_size = signal("md")
  toggle_card_size(){
    let options = ["lg","md","sm"]
    let i_ind = options.findIndex(x => x === this.card_size()) + 1
    if (i_ind === options.length) {i_ind = 0}
    this.card_size.set(options[i_ind])
  }

}
