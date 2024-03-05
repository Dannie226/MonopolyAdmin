const fs = require("fs");

const symbols = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()-=_+`~,<.>/?\\|[{]};:'\"";

let p = "";

for(let i = 0; i < 64; i++) {
    p += symbols[(Math.random() * symbols.length) | 0];
}

fs.writeFileSync("./password.txt", p, "utf8");
console.log(p);

const password = fs.readFileSync("./password.txt", "utf8");

const bin = Uint8Array.from(password, (k) => k.charCodeAt(0));
const key = new Uint8Array(bin.length);

for(let i = 0; i < key.length; i++) {
    key[i] = Math.random() * 255;
}

const enc = new Uint8Array(bin.length);

for(let i = 0; i < key.length; i++) {
    enc[i] = bin[i] ^ key[i];
}

const f = new Uint8Array(enc.length + key.length);

for(let i = 0; i < enc.length; i++) {
    f[i] = enc[i];
    f[i + enc.length] = key[i];
}

fs.writeFileSync("./encrypted.txt", f, "binary");

const encrypted = fs.readFileSync("./encrypted.txt", "binary");

const data = Uint8Array.from(encrypted, k => k.charCodeAt(0));

const dec = new Uint8Array(data.length / 2);
const dkey = new Uint8Array(data.length / 2);

for(let i = 0; i < enc.length; i++) {
    dec[i] = data[i];
    dkey[i] = data[i + enc.length];
}

const dbin = new Uint8Array(enc.length);

for(let i = 0; i < bin.length; i++) {
    dbin[i] = dec[i] ^ dkey[i];
}

let dpassword = String.fromCharCode(...dbin);

console.log(password);
console.log(dpassword);