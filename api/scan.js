text: `Lees deze bon/factuur uit en geef de volgende gegevens terug als JSON (alleen JSON, geen uitleg):
{
  "datum": "DD-MM-JJJJ",
  "omschrijving": "naam winkel of leverancier + korte omschrijving",
  "bedrag_incl": 0.00,
  "btw_bedrag": 0.00,
  "categorie": "een van: Software / Marketing / Opleidingen / Reiskosten / Telefoon en Internet / Kantoor / Bankkosten / Overige kosten",
  "opmerking": null
}
Regels:
- bedrag_incl is het totaalbedrag inclusief BTW
- btw_bedrag is het BTW bedrag (zoek naar BTW, tax, VAT op de bon)
- Als BTW niet vermeld staat, bereken dan 21% van het excl. bedrag
- datum altijd in DD-MM-JJJJ formaat
- Als een veld niet leesbaar is, gebruik dan null`,
