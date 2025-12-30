// ===================================================================
// IMPERIUM MALEDICTUM NPC PARSER para FoundryVTT
// Módulo independiente con arquitectura expansible
// ===================================================================

// ===================================================================
// UTILIDADES
// ===================================================================
class ImperiumUtils {
    static log(message) {
        console.log("Imperium Parser | " + message);
    }

    static generateId() {
        let id = '';
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 16; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    static splitLines(text) {
        return text.split('\n').map(l => l.trim()).filter(l => l);
    }

    static getCharacteristicBonus(value) {
        return Math.floor(value / 10);
    }

    static calculateAdvances(skillValue, characteristicValue) {
        const diff = skillValue - characteristicValue;
        return Math.floor(diff / 5);
    }

    static normalizeTraitKey(trait) {
        const traitMap = {
            'close': 'close',
            'loud': 'loud',
            'rapid fire': 'rapidFire',
            'twin-linked': 'twinLinked',
            'blast': 'blast',
            'flame': 'flame',
            'melta': 'melta',
            'spray': 'spray',
            'unwieldy': 'unwieldy',
            'parry': 'parry',
            'defensive': 'defensive',
            'proven': 'proven',
            'reliable': 'reliable',
            'unstable': 'unstable',
            'spread': 'spread',
            'penetrating': 'penetrating',
            'two-handed': 'twohanded',
            'two handed': 'twohanded',
            'subtle': 'subtle'
        };
        const lower = trait.toLowerCase().trim();
        return traitMap[lower] || lower.replace(/\s+/g, '');
    }
}

// ===================================================================
// CREADORES DE ITEMS
// ===================================================================
class ImperiumItemFactory {
    static createSpecialisation(name, skillKey, advances) {
        const now = Date.now();
        return {
            name: name,
            type: "specialisation",
            img: "modules/impmal-core/assets/icons/generic.webp",
            system: {
                notes: { player: "", gm: "" },
                advances: advances,
                restricted: false,
                skill: skillKey
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }

    static createTrait(name, description) {
        const now = Date.now();
        return {
            name: name,
            type: "trait",
            img: "modules/impmal-core/assets/icons/blank.webp",
            system: {
                notes: { player: `<p>${description}</p>`, gm: "" },
                attack: {
                    type: "melee",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    damage: { SL: false, base: "", characteristic: "", ignoreAP: false },
                    range: "",
                    traits: { list: [] },
                    self: false
                },
                test: {
                    difficulty: "challenging",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    self: false
                },
                roll: { enabled: false, formula: "", label: "" },
                category: "standard",
                vehicle: { maneuverable: 0 }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }

    static createWeapon(name, content) {
        const now = Date.now();
        
        let attackType = "melee";
        let category = "mundane";
        let spec = "oneHanded";
        let range = "";
        let damage = { base: "0", SL: false };
        let traits = [];

        // Detectar tipo de arma
        if (content.match(/Ranged\s*\(/i)) {
            attackType = "ranged";
            const specMatch = content.match(/Ranged\s*\(([^)]+)\)/i);
            if (specMatch) {
                spec = specMatch[1].toLowerCase();
                category = "solid";
            }
        } else if (content.match(/Melee\s*\(/i)) {
            attackType = "melee";
            const specMatch = content.match(/Melee\s*\(([^)]+)\)/i);
            if (specMatch) {
                const specText = specMatch[1].trim();
                spec = specText.toLowerCase().replace(/[-\s]+(.)/g, (_, c) => c.toUpperCase());
            }
        }

        // Detectar rango
        let rangeMatch = content.match(/\[([^\]]+)\s+Range\]/i);
        if (!rangeMatch) {
            rangeMatch = content.match(/(Short|Medium|Long|Extreme)\s+Range/i);
        }
        if (rangeMatch) {
            range = (rangeMatch[1] || rangeMatch[0]).toLowerCase().replace(/\s+range/gi, '');
        }

        // Detectar daño
        const dmgMatchSL = content.match(/(\d+)\s*\+\s*SL\s+Damage/i);
        if (dmgMatchSL) {
            damage.base = dmgMatchSL[1];
            damage.SL = true;
        } else {
            const dmgMatchOther = content.match(/(\d+)\s+(?:\+\s*SL\s+\w+\s+)?Damage/i);
            if (dmgMatchOther) {
                damage.base = dmgMatchOther[1];
                damage.SL = false;
            }
        }

        // Extraer traits
        let traitsText = "";
        if (range) {
            const rangePos = content.toLowerCase().indexOf(range + " range");
            if (rangePos !== -1) {
                traitsText = content.substring(rangePos + range.length + 6).trim();
            }
        }
        if (!traitsText) {
            traitsText = content.split(/Damage/i)[1] || "";
            traitsText = traitsText.trim();
        }
        traitsText = traitsText.replace(/^[.,\s]+/, '').replace(/\.\s*$/, '').trim();

        ImperiumUtils.log(`Traits text: "${traitsText}"`);
        let additionalNotes = '';
        if (traitsText) {
            const parseResult = this.parseWeaponTraits(traitsText);
            traits = parseResult.traits;
            additionalNotes = parseResult.additionalNotes;
            ImperiumUtils.log(`Parsed ${traits.length} traits`);
        }

        return {
            name: name,
            type: "weapon",
            img: attackType === "ranged" ? 
                "modules/impmal-core/assets/icons/weapons/ranged-weapon.webp" : 
                "modules/impmal-core/assets/icons/weapons/melee-weapon.webp",
            system: {
                notes: { player: additionalNotes ? `<p>${additionalNotes}</p>` : "", gm: "" },
                encumbrance: { value: 0 },
                cost: 0,
                availability: "",
                quantity: 1,
                equipped: { value: false, force: false },
                damage: {
                    base: damage.base,
                    characteristic: "",
                    SL: damage.SL,
                    ignoreAP: false
                },
                traits: { list: traits },
                ammoCost: 0,
                attackType: attackType,
                category: category,
                spec: spec,
                range: range,
                rangeModifier: { value: 0, override: "" },
                mag: { value: 1, current: 0 },
                ammo: { id: "" },
                mods: { list: [] },
                slots: { list: [], value: 0 }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }

    static parseWeaponTraits(traitsText) {
        const traits = [];
        let cleanTraitsText = traitsText;
        let additionalNotes = '';

        const dotIndex = traitsText.indexOf('.');
        if (dotIndex !== -1) {
            cleanTraitsText = traitsText.substring(0, dotIndex).trim();
            additionalNotes = traitsText.substring(dotIndex + 1).trim();
        }

        const parts = cleanTraitsText.split(',').map(t => t.trim());
        const traitsWithValue = ['heavy', 'inflict', 'penetrating', 'rapidfire', 'rend', 'shield', 'supercharge', 'thrown'];

        let i = 0;
        while (i < parts.length) {
            const part = parts[i];

            if (part.includes('(') && !part.includes(')')) {
                let fullPart = part;
                i++;
                while (i < parts.length && !fullPart.includes(')')) {
                    fullPart += ', ' + parts[i];
                    i++;
                }

                const match = fullPart.match(/^(.+?)\s*\(([^)]+)\)$/);
                if (match) {
                    const key = ImperiumUtils.normalizeTraitKey(match[1]);
                    if (traitsWithValue.some(t => t.toLowerCase() === key.toLowerCase())) {
                        traits.push({ key: key, value: match[2] });
                    } else {
                        traits.push({ key: key });
                    }
                }
            } else {
                const parenMatch = part.match(/^(.+?)\s*\(([^)]+)\)$/);
                if (parenMatch) {
                    const key = ImperiumUtils.normalizeTraitKey(parenMatch[1]);
                    if (traitsWithValue.some(t => t.toLowerCase() === key.toLowerCase())) {
                        traits.push({ key: key, value: parenMatch[2] });
                    } else {
                        traits.push({ key: key });
                    }
                } else {
                    const cleanPart = part.replace(/\.$/, '').trim();
                    if (cleanPart) {
                        traits.push({ key: ImperiumUtils.normalizeTraitKey(cleanPart) });
                    }
                }
                i++;
            }
        }

        return { traits, additionalNotes };
    }

    static createEquipment(name) {
        const now = Date.now();
        return {
            name: name,
            type: "equipment",
            img: "modules/impmal-core/assets/icons/equipment/equipment.webp",
            system: {
                notes: { player: "", gm: "" },
                equipped: { value: false, force: false },
                encumbrance: { value: 0 },
                cost: 0,
                availability: "",
                quantity: 1,
                uses: { value: null, max: null, enabled: false },
                test: {
                    difficulty: "challenging",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    self: false
                },
                traits: { list: [] },
                slots: { list: [], value: 0 }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }
}

// ===================================================================
// PARSER DE CRIATURAS IMPERIUM MALEDICTUM
// ===================================================================
class ImperiumCreatureParser {
    async parseInput(inputText, options = {}) {
        if (!inputText) {
            return { success: false, error: "No input provided" };
        }

        const lines = ImperiumUtils.splitLines(inputText);
        const errors = [];
        const creatures = [];

        const creatureBlocks = this.splitIntoBlocks(lines);

        if (creatureBlocks.length === 0) {
            return { success: false, error: "No creatures found in text" };
        }

        for (let blockIdx = 0; blockIdx < creatureBlocks.length; blockIdx++) {
            try {
                const creature = await this.parseCreatureBlock(creatureBlocks[blockIdx], options);
                creatures.push(creature);
            } catch (error) {
                ImperiumUtils.log(`Error parsing creature ${blockIdx + 1}: ${error.message}`);
                errors.push([`Creature ${blockIdx + 1}`, error.message]);
            }
        }

        return { success: true, creatures: creatures, errors: errors };
    }

    splitIntoBlocks(lines) {
        const blocks = [];
        let currentBlock = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detectar inicio: Size Species (Faction), Role
            if (line.match(/^(Tiny|Small|Average|Medium|Large|Huge|Enormous|Monstrous|Gargantuan)\s+/i)) {
                if (currentBlock.length > 0) {
                    blocks.push(currentBlock);
                }
                
                // Capturar líneas anteriores como nombre (sin importar mayúsculas)
                let nameLines = [];
                let j = i - 1;
                while (j >= 0 && 
                       lines[j] !== '' && 
                       !lines[j].includes('(') &&
                       !lines[j].match(/^(Tiny|Small|Average|Medium|Large|Huge|Enormous|Monstrous|Gargantuan)\s+/i)) {
                    nameLines.unshift(lines[j]);
                    j--;
                }
                
                currentBlock = nameLines;
                currentBlock.push(line);
            } else if (currentBlock.length > 0) {
                currentBlock.push(line);
            }
        }

        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    async parseCreatureBlock(blockLines, options) {
        // Parsear nombre (todas las líneas antes del Size)
        let nameLines = [];
        let nameEndIndex = 0;
        
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];
            if (line.match(/^(Tiny|Small|Average|Medium|Large|Huge|Enormous|Monstrous|Gargantuan)\s+/i)) {
                nameEndIndex = i;
                break;
            }
            nameLines.push(line);
        }

        const name = nameLines.join(' ').trim();
        ImperiumUtils.log(`Parsing: ${name}`);

        // Parsear header: Size Species (Faction), Role
        let size = "medium";
        let species = "";
        let faction = "";
        let role = "troop";

        if (nameEndIndex < blockLines.length) {
            const headerLine = blockLines[nameEndIndex];
            
            // Con species: Size Species (Faction), Role
            let headerMatch = headerLine.match(/^(\w+)\s+(\w+)\s*\(([^)]+)\),\s*(\w+)/);
            if (headerMatch) {
                size = headerMatch[1].toLowerCase();
                species = headerMatch[2];
                faction = headerMatch[3];
                role = headerMatch[4].toLowerCase();
            } else {
                // Sin species: Size (Faction), Role
                headerMatch = headerLine.match(/^(\w+)\s*\(([^)]+)\),\s*(\w+)/);
                if (headerMatch) {
                    size = headerMatch[1].toLowerCase();
                    faction = headerMatch[2];
                    species = faction;
                    role = headerMatch[3].toLowerCase();
                }
            }
        }

        // Crear estructura base
        const creature = this.buildCreatureData(name, size, species, faction, role, options);

        // Parsear secciones
        this.parseCharacteristics(blockLines, creature);
        this.parseCombat(blockLines, creature);
        this.parseInitiative(blockLines, creature);
        this.parseSkills(blockLines, creature);
        this.parseTraits(blockLines, creature);
        this.parseAttacks(blockLines, creature);
        this.parsePossessions(blockLines, creature);
        this.parseNotes(blockLines, creature);

        return creature;
    }

    buildCreatureData(name, size, species, faction, role, options) {
        const now = Date.now();

        return {
            name: name,
            type: "npc",
            img: "modules/impmal-core/assets/tokens/unknown.webp",
            system: {
                characteristics: {
                    ws: { starting: 0, advances: 0, modifier: 0 },
                    bs: { starting: 0, advances: 0, modifier: 0 },
                    str: { starting: 0, advances: 0, modifier: 0 },
                    tgh: { starting: 0, advances: 0, modifier: 0 },
                    ag: { starting: 0, advances: 0, modifier: 0 },
                    int: { starting: 0, advances: 0, modifier: 0 },
                    per: { starting: 0, advances: 0, modifier: 0 },
                    wil: { starting: 0, advances: 0, modifier: 0 },
                    fel: { starting: 0, advances: 0, modifier: 0 }
                },
                skills: {
                    athletics: { characteristic: "str", advances: 0, modifier: 0 },
                    awareness: { characteristic: "per", advances: 0, modifier: 0 },
                    dexterity: { characteristic: "ag", advances: 0, modifier: 0 },
                    discipline: { characteristic: "wil", advances: 0, modifier: 0 },
                    fortitude: { characteristic: "tgh", advances: 0, modifier: 0 },
                    intuition: { characteristic: "per", advances: 0, modifier: 0 },
                    linguistics: { characteristic: "int", advances: 0, modifier: 0 },
                    logic: { characteristic: "int", advances: 0, modifier: 0 },
                    lore: { characteristic: "int", advances: 0, modifier: 0 },
                    medicae: { characteristic: "int", advances: 0, modifier: 0 },
                    melee: { characteristic: "ws", advances: 0, modifier: 0 },
                    navigation: { characteristic: "int", advances: 0, modifier: 0 },
                    piloting: { characteristic: "ag", advances: 0, modifier: 0 },
                    presence: { characteristic: "wil", advances: 0, modifier: 0 },
                    psychic: { characteristic: "wil", advances: 0, modifier: 0 },
                    ranged: { characteristic: "bs", advances: 0, modifier: 0 },
                    rapport: { characteristic: "fel", advances: 0, modifier: 0 },
                    reflexes: { characteristic: "ag", advances: 0, modifier: 0 },
                    stealth: { characteristic: "ag", advances: 0, modifier: 0 },
                    tech: { characteristic: "int", advances: 0, modifier: 0 }
                },
                notes: { player: "", gm: "" },
                combat: {
                    size: size,
                    armourModifier: 0,
                    speed: {
                        land: { value: "normal", modifier: 0 },
                        fly: { value: "none", modifier: 0 }
                    },
                    wounds: { max: 0, value: 0 },
                    criticals: { max: 0, value: 0 },
                    resolve: 0,
                    armour: { formula: "", value: 0, useItems: false }
                },
                faction: { id: "", name: faction },
                species: species,
                role: role,
                autoCalc: {
                    wounds: options.autoCalcWounds !== false,
                    criticals: options.autoCalcCriticals !== false,
                    initiative: options.autoCalcInitiative !== false
                }
            },
            prototypeToken: {
                name: name,
                width: 1,
                height: 1,
                texture: { src: "modules/impmal-core/assets/tokens/unknown.webp" },
                disposition: -1
            },
            items: [],
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }

    parseCharacteristics(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^WS\s+BS\s+Str/i)) {
                if (i + 1 < blockLines.length) {
                    const charValues = blockLines[i + 1].split(/\s+/).map(v => parseInt(v) || 0);
                    const charKeys = ['ws', 'bs', 'str', 'tgh', 'ag', 'int', 'per', 'wil', 'fel'];
                    
                    charKeys.forEach((key, idx) => {
                        if (idx < charValues.length) {
                            creature.system.characteristics[key].starting = charValues[idx];
                            ImperiumUtils.log(`${key.toUpperCase()}: ${charValues[idx]}`);
                        }
                    });
                }
                break;
            }
        }
    }

    parseCombat(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^Armou?r\s+Wounds\s+Critical\s+Wounds/i)) {
                if (i + 1 < blockLines.length) {
                    const vals = blockLines[i + 1].split(/\s+/);
                    const armorText = vals[0] || "0";
                    
                    if (armorText.match(/\d*[dD]\d+/)) {
                        creature.system.combat.armour.formula = armorText;
                        if (armorText.includes('+')) {
                            const baseMatch = armorText.match(/^(\d+)\+/);
                            creature.system.combat.armour.value = baseMatch ? parseInt(baseMatch[1]) : 0;
                        } else {
                            creature.system.combat.armour.value = 0;
                        }
                    } else {
                        creature.system.combat.armour.value = parseInt(armorText) || 0;
                    }
                    
                    creature.system.combat.wounds.max = parseInt(vals[1]) || 0;
                    creature.system.combat.criticals.max = parseInt(vals[2]) || 0;
                    
                    ImperiumUtils.log(`Armour: ${creature.system.combat.armour.value}, Wounds: ${creature.system.combat.wounds.max}`);
                }
                break;
            }
        }
    }

    parseInitiative(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^Initiative?\s+Speed/i)) {
                if (i + 1 < blockLines.length) {
                    const vals = blockLines[i + 1].split(/\s+/);
                    const initiativeValue = parseInt(vals[0]) || 0;
                    
                    let speedText = vals[1] || "normal";
                    let hasFly = false;
                    let resolveIndex = 2;

                    if (vals[2] && vals[2].toLowerCase() === 'fly') {
                        hasFly = true;
                        resolveIndex = 3;
                    } else if (speedText.toLowerCase().includes('fly')) {
                        hasFly = true;
                        resolveIndex = 2;
                    }

                    const speedVal = speedText.replace(/,/g, '').replace(/fly/gi, '').toLowerCase().trim();
                    creature.system.combat.speed.land.value = speedVal;

                    if (hasFly) {
                        creature.system.combat.speed.fly.value = speedVal;
                    }

                    const resolveVal = parseInt(vals[resolveIndex]) || 0;
                    creature.system.combat.resolve = resolveVal;

                    // Ajustar Initiative modificando Ag
                    const baseInit = ImperiumUtils.getCharacteristicBonus(creature.system.characteristics.ag.starting) + 
                                    ImperiumUtils.getCharacteristicBonus(creature.system.characteristics.per.starting);
                    const neededModifier = initiativeValue - baseInit;
                    
                    if (neededModifier > 0) {
                        creature.system.characteristics.ag.modifier = neededModifier;
                        ImperiumUtils.log(`Initiative: ${initiativeValue} (Ag modifier: +${neededModifier})`);
                    }
                }
                break;
            }
        }
    }

    parseSkills(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^Skills:\s*/i)) {
                let skillsText = line.replace(/^Skills:\s*/i, '').trim();
                let j = i + 1;
                
                while (j < blockLines.length && 
                       !blockLines[j].match(/^(TRAITS|ATTACKS|Possessions):/i) && 
                       !skillsText.endsWith('.')) {
                    skillsText += ' ' + blockLines[j].trim();
                    j++;
                    if (skillsText.endsWith('.')) break;
                }
                
                skillsText = skillsText.replace(/\.$/, '').trim();
                const skillEntries = skillsText.split(',').map(s => s.trim()).filter(s => s);

                const skillData = {};
                skillEntries.forEach(entry => {
                    const specMatch = entry.match(/^(\w+)\s*\(([^)]+)\)\s*(\d+)$/);
                    if (specMatch) {
                        const skillName = specMatch[1].toLowerCase();
                        const specName = specMatch[2].trim();
                        const skillValue = parseInt(specMatch[3]);
                        if (creature.system.skills[skillName]) {
                            if (!skillData[skillName]) skillData[skillName] = { base: null, specs: [] };
                            skillData[skillName].specs.push({ name: specName, value: skillValue });
                        }
                    } else {
                        const match = entry.match(/^(\w+)\s+(\d+)$/);
                        if (match) {
                            const skillName = match[1].toLowerCase();
                            const skillValue = parseInt(match[2]);
                            if (creature.system.skills[skillName]) {
                                if (!skillData[skillName]) skillData[skillName] = { base: null, specs: [] };
                                skillData[skillName].base = skillValue;
                            }
                        }
                    }
                });

                Object.keys(skillData).forEach(skillName => {
                    const data = skillData[skillName];
                    const charKey = creature.system.skills[skillName].characteristic;
                    const charValue = creature.system.characteristics[charKey].starting;
                    let baseValue = data.base;
                    if (baseValue === null && data.specs.length > 0) {
                        baseValue = Math.min(...data.specs.map(s => s.value));
                    }
                    if (baseValue === null) baseValue = charValue;
                    const baseAdvances = ImperiumUtils.calculateAdvances(baseValue, charValue);
                    creature.system.skills[skillName].advances = baseAdvances;

                    data.specs.forEach(spec => {
                        const additionalAdvances = Math.floor((spec.value - baseValue) / 5);
                        creature.items.push(ImperiumItemFactory.createSpecialisation(spec.name, skillName, additionalAdvances));
                    });
                });
                break;
            }
        }
    }

    parseTraits(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^TRAITS\s*$/i)) {
                let j = i + 1;
                
                while (j < blockLines.length && !blockLines[j].match(/^ATTACKS\s*$/i)) {
                    const traitLine = blockLines[j].trim();
                    
                    if (traitLine.includes(':')) {
                        const colonIdx = traitLine.indexOf(':');
                        const traitName = traitLine.substring(0, colonIdx).trim();
                        let traitDesc = traitLine.substring(colonIdx + 1).trim();
                        
                        let k = j + 1;
                        while (k < blockLines.length && 
                               !blockLines[k].match(/^(ATTACKS|Possessions|NOTES):/i) && 
                               !blockLines[k].match(/^(ATTACKS|NOTES)\s*$/i) && 
                               !blockLines[k].includes(':')) {
                            traitDesc += ' ' + blockLines[k].trim();
                            k++;
                        }
                        
                        creature.items.push(ImperiumItemFactory.createTrait(traitName, traitDesc));
                        ImperiumUtils.log(`Trait: ${traitName}`);
                        j = k;
                    } else {
                        j++;
                    }
                }
                break;
            }
        }
    }

    parseAttacks(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^ATTACKS\s*$/i)) {
                let j = i + 1;
                
                while (j < blockLines.length && 
                       !blockLines[j].match(/^(Possessions|NOTES):/i) && 
                       !blockLines[j].match(/^NOTES\s*$/i)) {
                    const attackLine = blockLines[j].trim();
                    
                    if (attackLine.includes(':')) {
                        const colonIdx = attackLine.indexOf(':');
                        const weaponName = attackLine.substring(0, colonIdx).trim();
                        let weaponDesc = attackLine.substring(colonIdx + 1).trim();
                        
                        let k = j + 1;
                        while (k < blockLines.length && 
                               !blockLines[k].match(/^(Possessions|NOTES):/i) && 
                               !blockLines[k].match(/^NOTES\s*$/i) && 
                               !blockLines[k].includes(':')) {
                            weaponDesc += ' ' + blockLines[k].trim();
                            k++;
                        }
                        
                        creature.items.push(ImperiumItemFactory.createWeapon(weaponName, weaponDesc));
                        ImperiumUtils.log(`Weapon: ${weaponName}`);
                        j = k;
                    } else {
                        j++;
                    }
                }
                break;
            }
        }
    }

    parsePossessions(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^Possessions:/i)) {
                let possText = line.replace(/^Possessions:/i, '').trim();
                let j = i + 1;
                
                while (j < blockLines.length && 
                       !blockLines[j].match(/^NOTES\s*$/i) && 
                       !possText.endsWith('.')) {
                    possText += ' ' + blockLines[j].trim();
                    j++;
                }
                
                if (possText.endsWith('.')) possText = possText.slice(0, -1);
                
                const items = possText.split(',');
                items.forEach(item => {
                    item = item.trim();
                    if (!item) return;
                    
                    if (item.match(/^(a|an)\s+/i)) {
                        item = item.replace(/^(a|an)\s+/i, '');
                    }
                    
                    creature.items.push(ImperiumItemFactory.createEquipment(item));
                    ImperiumUtils.log(`Equipment: ${item}`);
                });
                break;
            }
        }
    }

    parseNotes(blockLines, creature) {
        for (let i = 0; i < blockLines.length; i++) {
            const line = blockLines[i];

            if (line.match(/^NOTES\s*$/i)) {
                let notesText = '';
                let j = i + 1;
                
                while (j < blockLines.length) {
                    notesText += blockLines[j] + ' ';
                    j++;
                }
                
                notesText = notesText.trim();
                notesText = notesText.replace(/\.\s+/g, '.<br>');
                
                if (notesText) {
                    creature.system.notes.player = `<p>${notesText}</p>`;
                    ImperiumUtils.log(`Notes added`);
                }
                break;
            }
        }
    }
}

// ===================================================================
// PARSER DE PSYCHIC POWERS
// ===================================================================
class ImperiumPowerParser {
    async parseInput(inputText, options = {}) {
        if (!inputText) {
            return { success: false, error: "No input provided" };
        }

        const lines = inputText.split('\n').filter(l => l.trim());
        const errors = [];
        const powers = [];
        const validDisciplines = ['pyromancy', 'minor', 'biomancy', 'divination', 'telekinesis', 'telepathy', 'waaagh', ''];

        let currentDiscipline = '';
        let idx = 0;

        while (idx < lines.length) {
            const line = lines[idx].trim();

            if (line.startsWith('º')) {
                const discipline = line.substring(1).trim().toLowerCase();
                if (!validDisciplines.includes(discipline)) {
                    errors.push(['Discipline', `Invalid discipline "${discipline}". Valid: ${validDisciplines.filter(d => d).join(', ')}`]);
                    idx++;
                    continue;
                }
                currentDiscipline = discipline;
                idx++;
            } else {
                const letters = line.replace(/[^a-zA-Z]/g, '');
                const uppercase = line.replace(/[^A-Z]/g, '');
                const isAllCaps = letters.length > 0 && uppercase.length === letters.length;

                if (isAllCaps) {
                    let nextNonEmpty = idx + 1;
                    while (nextNonEmpty < lines.length && !lines[nextNonEmpty].trim()) {
                        nextNonEmpty++;
                    }

                    if (nextNonEmpty < lines.length && lines[nextNonEmpty].trim().startsWith('Cognomens:')) {
                        try {
                            const result = this.parsePsychicPower(lines, idx, currentDiscipline);
                            if (result && result.power) {
                                powers.push(result.power);
                                idx = result.nextIdx;
                            } else {
                                idx++;
                            }
                        } catch (error) {
                            errors.push([line, error.message]);
                            idx++;
                        }
                    } else {
                        idx++;
                    }
                } else {
                    idx++;
                }
            }
        }

        return { success: true, items: powers, errors: errors };
    }

    parsePsychicPower(lines, startIdx, currentDiscipline) {
        let nameLines = [];
        let idx = startIdx;

        while (idx < lines.length) {
            const line = lines[idx].trim();
            if (!line || line.startsWith('Cognomens:') || line.startsWith('*') || line.startsWith('º')) {
                break;
            }

            const lineWithoutAsterisks = line.replace(/\*/g, '');
            const letters = lineWithoutAsterisks.replace(/[^a-zA-Z]/g, '');
            const uppercase = lineWithoutAsterisks.replace(/[^A-Z]/g, '');

            if (letters.length > 0 && uppercase.length === letters.length) {
                nameLines.push(line.replace(/\*/g, '').trim());
                idx++;
            } else {
                break;
            }
        }

        if (nameLines.length === 0) {
            return null;
        }

        const name = nameLines.join(' ');
        const hasAsterisk = lines[startIdx].includes('*');

        const fields = {};
        let description = '';
        let inDescription = false;

        while (idx < lines.length) {
            const line = lines[idx].trim();

            if (!line) {
                if (inDescription) description += '\n';
                idx++;
                continue;
            }

            const letters = line.replace(/[^a-zA-Z]/g, '');
            const uppercase = line.replace(/[^A-Z]/g, '');
            const isAllCaps = letters.length > 0 && uppercase.length === letters.length;

            if (line.startsWith('*') || line.startsWith('º')) break;
            if (isAllCaps && idx + 1 < lines.length && lines[idx + 1].trim().startsWith('Cognomens:')) break;

            if (line.startsWith('Cognomens:')) {
                fields.cognomens = line.substring('Cognomens:'.length).trim();
            } else if (line.startsWith('Warp Rating:')) {
                const ratingStr = line.substring('Warp Rating:'.length).trim();
                fields.warpRating = parseInt(ratingStr) || 1;
            } else if (line.startsWith('Difficulty:')) {
                fields.difficulty = line.substring('Difficulty:'.length).trim();
            } else if (line.startsWith('Range:')) {
                fields.range = line.substring('Range:'.length).trim();
            } else if (line.startsWith('Target:')) {
                fields.target = line.substring('Target:'.length).trim();
            } else if (line.startsWith('Duration:')) {
                fields.duration = line.substring('Duration:'.length).trim();
                inDescription = true;
            } else if (inDescription) {
                description += (description ? '\n' : '') + line;
            }

            idx++;
        }

        if (!fields.cognomens || !fields.warpRating || !fields.difficulty || !fields.range || !fields.target || !fields.duration) {
            return null;
        }

        const notesHtml = `<p><strong>Cognomens</strong>: ${fields.cognomens}</p><p>${description}</p>`;

        const disciplineImages = {
            'pyromancy': 'modules/impmal-core/assets/icons/powers/pyromancy-power.webp',
            'telekinesis': 'modules/impmal-core/assets/icons/powers/telekinesis-power.webp',
            'telepathy': 'modules/impmal-core/assets/icons/powers/telepathy-power.webp',
            'biomancy': 'modules/impmal-core/assets/icons/powers/biomancy-power.webp',
            'divination': 'modules/impmal-core/assets/icons/powers/divination-power.webp',
            'minor': 'modules/impmal-core/assets/icons/powers/minor-power.webp',
            'waaagh': 'modules/impmal-core/assets/icons/powers/waaagh-power.webp',
            '': 'modules/impmal-core/assets/icons/powers/power.webp'
        };

        const now = Date.now();
        const power = {
            name: name,
            type: "power",
            img: disciplineImages[currentDiscipline] || disciplineImages[''],
            system: {
                notes: { player: notesHtml, gm: "" },
                damage: { base: "", characteristic: "", SL: false, ignoreAP: false },
                discipline: currentDiscipline,
                minorSpecialisation: "",
                rating: fields.warpRating,
                difficulty: this.normalizeDifficulty(fields.difficulty),
                range: this.normalizeRange(fields.range),
                target: fields.target,
                duration: this.normalizeDuration(fields.duration),
                overt: hasAsterisk,
                opposed: {
                    difficulty: "",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    self: false
                },
                xpOverride: null
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };

        return { power: power, nextIdx: idx };
    }

    normalizeDifficulty(difficultyText) {
        const lower = difficultyText.toLowerCase();
        if (lower.includes('routine')) return 'routine';
        if (lower.includes('challenging')) return 'challenging';
        if (lower.includes('difficult')) return 'difficult';
        if (lower.includes('hard')) return 'hard';
        return 'challenging';
    }

    normalizeRange(rangeText) {
        const lower = rangeText.toLowerCase();
        if (lower === 'self') return 'self';
        if (lower === 'immediate') return 'immediate';
        if (lower === 'short') return 'short';
        if (lower === 'medium') return 'medium';
        if (lower === 'long') return 'long';
        if (lower === 'extreme') return 'extreme';
        if (lower === 'special') return 'special';
        return lower;
    }

    normalizeDuration(durationText) {
        const lower = durationText.toLowerCase();
        if (lower.includes('instant')) return 'instant';
        if (lower.includes('sustained')) return 'sustained';
        return lower;
    }
}

// ===================================================================
// PARSER DE TALENTS
// ===================================================================
class ImperiumTalentParser {
    async parseInput(inputText, options = {}) {
        if (!inputText) {
            return { success: false, error: "No input provided" };
        }

        const lines = inputText.split('\n').map(l => l.trim());
        const errors = [];
        const talents = [];

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            // Detectar nombre del talent (línea en MAYÚSCULAS)
            if (line && line === line.toUpperCase() && line.length > 0 && /[A-Z]/.test(line)) {
                const talentName = line;
                const descriptionLines = [];
                i++;

                // Recoger descripción hasta el siguiente talent o fin
                while (i < lines.length) {
                    const nextLine = lines[i].trim();
                    
                    if (nextLine && nextLine === nextLine.toUpperCase() && /[A-Z]/.test(nextLine)) {
                        break;
                    }
                    
                    if (nextLine) {
                        descriptionLines.push(nextLine);
                    }
                    i++;
                }

                if (descriptionLines.length > 0) {
                    try {
                        talents.push(this.parseTalent(talentName, descriptionLines));
                    } catch (error) {
                        errors.push([talentName, error.message]);
                    }
                }
            } else {
                i++;
            }
        }

        return { success: true, items: talents, errors: errors };
    }

    parseTalent(name, descriptionLines) {
        let combined = descriptionLines.join(' ').replace(/\s+/g, ' ').trim();
        
        if (combined.match(/^Requirement:/i)) {
            combined = combined.replace(/(Requirement:[^.]+\.)\s*/, '$1<br>');
        }
        
        const description = `<p>${combined}</p>`;
        const now = Date.now();

        return {
            name: name,
            type: "talent",
            img: "modules/impmal-core/assets/icons/generic.webp",
            system: {
                notes: { player: description, gm: "" },
                requirement: { value: "", script: "" },
                test: {
                    difficulty: "challenging",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    self: false
                },
                taken: 1,
                xpCost: 100,
                effectOptions: { list: [] },
                effectTakenRequirement: {},
                effectRepeatable: {},
                effectChoices: {},
                slots: { list: [], value: 0 }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }
}

// ===================================================================
// PARSER DE BOONS/LIABILITIES
// ===================================================================
class ImperiumBoonParser {
    async parseInput(inputText, options = {}) {
        if (!inputText) {
            return { success: false, error: "No input provided" };
        }

        const lines = inputText.split('\n').map(l => l.trim());
        const errors = [];
        const items = [];
        let currentCategory = "boon";

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            // Detectar marcador de categoría
            if (line.startsWith('º')) {
                const cat = line.substring(1).trim().toLowerCase();
                if (cat === 'boon' || cat === 'liability') {
                    currentCategory = cat;
                }
                i++;
                continue;
            }

            // Detectar nombre (línea en MAYÚSCULAS)
            if (line && line === line.toUpperCase() && line.length > 0) {
                const itemName = line;
                i++;

                let description = '';
                while (i < lines.length) {
                    const nextLine = lines[i];
                    
                    if (nextLine === nextLine.toUpperCase() && nextLine.length > 0 && nextLine !== '') break;
                    if (nextLine.startsWith('º')) break;

                    if (nextLine !== '') {
                        if (description) description += ' ';
                        description += nextLine;
                    }
                    i++;
                }

                if (description.trim()) {
                    try {
                        items.push(this.parseItem(itemName, description.trim(), currentCategory));
                    } catch (error) {
                        errors.push([itemName, error.message]);
                    }
                }
            } else {
                i++;
            }
        }

        return { success: true, items: items, errors: errors };
    }

    parseItem(name, description, category) {
        const now = Date.now();

        return {
            name: name,
            type: "boonLiability",
            img: "modules/impmal-core/assets/icons/generic.webp",
            system: {
                notes: { player: `<p>${description}</p>`, gm: "" },
                category: category,
                visible: true,
                test: {
                    difficulty: "",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    self: false
                },
                oneUse: false,
                used: false
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }
}

// ===================================================================
// PARSER DE VEHICLES
// ===================================================================
class ImperiumVehicleParser {
    async parseInput(inputText, options = {}) {
        if (!inputText) {
            return { success: false, error: "No input provided" };
        }

        const lines = inputText.split('\n').map(l => l.trim());
        const errors = [];
        const vehicles = [];
        let currentBlock = [];

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            if (line.match(/^Vehicle,/i)) {
                if (currentBlock.length > 0) {
                    try {
                        vehicles.push(await this.parseVehicleBlock(currentBlock));
                    } catch (error) {
                        errors.push([`Vehicle ${vehicles.length + 1}`, error.message]);
                    }
                }

                // Capturar nombre (líneas anteriores en MAYÚSCULAS)
                let nameStartIndex = i - 1;
                while (nameStartIndex >= 0 &&
                    lines[nameStartIndex].trim() === lines[nameStartIndex].trim().toUpperCase() &&
                    lines[nameStartIndex].trim() !== '') {
                    nameStartIndex--;
                }
                nameStartIndex++;

                currentBlock = [];
                for (let k = nameStartIndex; k <= i; k++) {
                    currentBlock.push(lines[k]);
                }
            } else if (currentBlock.length > 0) {
                currentBlock.push(line);
            }

            i++;
        }

        if (currentBlock.length > 0) {
            try {
                vehicles.push(await this.parseVehicleBlock(currentBlock));
            } catch (error) {
                errors.push([`Vehicle ${vehicles.length + 1}`, error.message]);
            }
        }

        return { success: true, items: vehicles, errors: errors };
    }

    async parseVehicleBlock(blockLines) {
        const lines = blockLines.filter(l => l.trim());

        // Parse name
        let nameLines = [];
        let i = 0;
        while (i < lines.length && !lines[i].match(/^Vehicle,/i)) {
            if (lines[i] === lines[i].toUpperCase() && lines[i].length > 0) {
                nameLines.push(lines[i]);
            }
            i++;
        }
        const name = nameLines.join(' ');

        // Parse type
        let category = "wheeled";
        let typeNote = "";
        if (i < lines.length) {
            const typeMatch = lines[i].match(/^Vehicle,\s*(\w+)(?:\s*\(([^)]+)\))?/i);
            if (typeMatch) {
                category = typeMatch[1].toLowerCase();
                typeNote = typeMatch[2] || "";
            }
            i++;
        }

        // Parse Armour/Speed/Crew
        let armourFront = 0, armourBack = 0, speed = "normal", crew = 1;
        if (i < lines.length && lines[i].match(/Armour\s+Speed\s+Crew/i)) {
            i++;
            if (i < lines.length) {
                const parts = lines[i].split(/\s+/);
                if (parts[0] && parts[0].includes('/')) {
                    const armourParts = parts[0].split('/');
                    armourFront = parseInt(armourParts[0]) || 0;
                    armourBack = parseInt(armourParts[1]) || 0;
                }
                speed = (parts[1] || "normal").toLowerCase().replace(/\*/g, '');
                crew = parseInt(parts[2]) || 1;
            }
            i++;
        }

        // Parse Passengers/Size
        let passengers = 0, size = "medium";
        if (i < lines.length && lines[i].match(/Passengers\s+Size/i)) {
            i++;
            if (i < lines.length) {
                const parts = lines[i].split(/\s+/);
                passengers = parseInt(parts[0]) || 0;
                size = (parts[1] || "medium").toLowerCase();
            }
            i++;
        }

        // Parse TRAITS
        let traitsText = "";
        if (typeNote) {
            traitsText += `Type: ${typeNote}\n\n`;
        }
        
        if (i < lines.length && lines[i].match(/^TRAITS/i)) {
            i++;
            while (i < lines.length && !lines[i].match(/^WEAPONS/i)) {
                traitsText += lines[i] + '\n';
                i++;
            }
        }

        // Parse WEAPONS
        const weaponItems = [];
        const crewWeapons = [];
        const passengerWeapons = [];

        if (i < lines.length && lines[i].match(/^WEAPONS/i)) {
            i++;
            let currentWeaponLines = [];
            
            while (i < lines.length && !lines[i].match(/^NOTES/i)) {
                const line = lines[i].trim();
                
                if (line.includes(':') && line.match(/\([^)]+\):/)) {
                    if (currentWeaponLines.length > 0) {
                        const parsed = this.parseWeapon(currentWeaponLines.join(' '));
                        if (parsed) {
                            weaponItems.push(parsed.weapon);
                            const ref = {
                                uuid: `Compendium.impmal-core.actors.Actor.${ImperiumUtils.generateId()}.Item.${parsed.weaponId}`,
                                id: parsed.weaponId,
                                name: parsed.weapon.name
                            };
                            if (parsed.location && parsed.location.includes('passenger')) {
                                passengerWeapons.push(ref);
                            } else {
                                crewWeapons.push(ref);
                            }
                        }
                    }
                    currentWeaponLines = [line];
                } else if (line && currentWeaponLines.length > 0) {
                    currentWeaponLines.push(line);
                }
                
                i++;
            }

            if (currentWeaponLines.length > 0) {
                const parsed = this.parseWeapon(currentWeaponLines.join(' '));
                if (parsed) {
                    weaponItems.push(parsed.weapon);
                    const ref = {
                        uuid: `Compendium.impmal-core.actors.Actor.${ImperiumUtils.generateId()}.Item.${parsed.weaponId}`,
                        id: parsed.weaponId,
                        name: parsed.weapon.name
                    };
                    if (parsed.location && parsed.location.includes('passenger')) {
                        passengerWeapons.push(ref);
                    } else {
                        crewWeapons.push(ref);
                    }
                }
            }
        }

        // Parse NOTES
        let notesText = "";
        if (i < lines.length && lines[i].match(/^NOTES/i)) {
            i++;
            while (i < lines.length) {
                notesText += lines[i] + '\n';
                i++;
            }
        }

        // Parse vehicle traits
        const traitItems = this.parseVehicleTraits(traitsText);
        const allItems = [...weaponItems, ...traitItems];

        const finalNotesText = (typeNote ? `Category: ${category.charAt(0).toUpperCase() + category.slice(1)} (${typeNote})\n\n` : '') + notesText;

        const now = Date.now();
        return {
            name: name,
            type: "vehicle",
            img: "modules/impmal-core/assets/tokens/unknown.webp",
            system: {
                category: category,
                actors: { list: [] },
                crew: { weapons: { list: crewWeapons }, number: crew },
                passengers: { weapons: { list: passengerWeapons }, number: passengers },
                combat: {
                    size: size,
                    armour: { front: armourFront, back: armourBack },
                    speed: { land: { value: speed, modifier: 0 }, fly: { value: "none", modifier: 0 } }
                },
                notes: { player: finalNotesText.trim() ? this.formatNotesText(finalNotesText.trim()) : "", gm: "" },
                autoCalc: { showPassengers: true },
                cost: null
            },
            prototypeToken: {
                name: name,
                width: 1,
                height: 1,
                texture: { src: "modules/impmal-core/assets/tokens/unknown.webp" },
                disposition: -1
            },
            items: allItems,
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }

    parseWeapon(weaponText) {
        const colonIdx = weaponText.indexOf(':');
        if (colonIdx === -1) return null;

        const namePart = weaponText.substring(0, colonIdx).trim();
        const statsPart = weaponText.substring(colonIdx + 1).trim();

        const locMatch = namePart.match(/^(.+?)\s*\(([^)]+)\)$/);
        let weaponName = namePart;
        let location = null;
        if (locMatch) {
            location = locMatch[2].trim().toLowerCase();
        }

        const attackTypeMatch = statsPart.match(/^(Ranged|Melee)\s*\(([^)]+)\)/i);
        if (!attackTypeMatch) return null;

        const attackType = attackTypeMatch[1].toLowerCase();
        const spec = attackTypeMatch[2].toLowerCase().replace(/\s+projectile/i, '').trim();

        const damageMatch = statsPart.match(/(\d+)\s+Damage/i);
        const damage = damageMatch ? damageMatch[1] : "0";

        let range = "";
        if (attackType === "ranged") {
            const rangeMatch = statsPart.match(/(Short|Medium|Long|Extreme)\s+Range/i);
            range = rangeMatch ? rangeMatch[1].toLowerCase() : "";
        }

        const weaponId = ImperiumUtils.generateId();
        const now = Date.now();
        
        return {
            weapon: {
                name: weaponName,
                type: "weapon",
                img: attackType === "ranged" ? "modules/impmal-core/assets/icons/weapons/ranged-weapon.webp" : "modules/impmal-core/assets/icons/weapons/melee-weapon.webp",
                system: {
                    notes: { player: "", gm: "" },
                    encumbrance: { value: 3 },
                    cost: 2000,
                    availability: "scarce",
                    quantity: 1,
                    equipped: { value: false, force: false },
                    damage: { base: damage, characteristic: "", SL: false, ignoreAP: false },
                    traits: { list: [] },
                    ammoCost: 60,
                    attackType: attackType,
                    category: spec,
                    spec: "ordnance",
                    range: range,
                    rangeModifier: { value: 0, override: "" },
                    mag: { value: 8, current: 8 },
                    ammo: { id: "" },
                    mods: { list: [] },
                    slots: { list: [], value: 0 }
                },
                effects: [],
                flags: {},
                _id: weaponId,
                _stats: { createdTime: now, modifiedTime: now }
            },
            location: location,
            weaponId: weaponId
        };
    }

    parseVehicleTraits(traitsText) {
        const traitItems = [];
        if (!traitsText || !traitsText.trim()) return traitItems;

        const lines = traitsText.split('\n').map(l => l.trim()).filter(l => l);
        let currentTrait = null;
        let currentDescription = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes(':') && !line.startsWith('0') && !line.startsWith('-')) {
                if (currentTrait) {
                    const fullDescription = currentDescription.join(' ').trim();
                    traitItems.push(this.createVehicleTrait(currentTrait, fullDescription));
                }
                
                const colonIndex = line.indexOf(':');
                currentTrait = line.substring(0, colonIndex).trim();
                const firstLine = line.substring(colonIndex + 1).trim();
                currentDescription = firstLine ? [firstLine] : [];
            } else if (currentTrait && line) {
                currentDescription.push(line);
            }
        }

        if (currentTrait) {
            const fullDescription = currentDescription.join(' ').trim();
            traitItems.push(this.createVehicleTrait(currentTrait, fullDescription));
        }

        return traitItems;
    }

    createVehicleTrait(name, description) {
        const now = Date.now();
        return {
            name: name,
            type: "trait",
            img: "modules/impmal-core/assets/icons/blank.webp",
            system: {
                notes: { player: `<p>${description}</p>`, gm: "" },
                attack: {
                    type: "melee",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    damage: { SL: false, base: "", characteristic: "", ignoreAP: false },
                    range: "",
                    traits: { list: [] },
                    self: false
                },
                test: {
                    difficulty: "challenging",
                    characteristic: "",
                    skill: { key: "", specialisation: "" },
                    self: false
                },
                roll: { enabled: false, formula: "", label: "" },
                category: "vehicle",
                vehicle: { maneuverable: 0 }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }

    formatNotesText(text) {
        let combined = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        const sentences = combined.split(/\.\s+(?=[A-Z])/);
        
        const paragraphs = sentences.map(sentence => {
            const trimmed = sentence.trim();
            if (trimmed && !trimmed.endsWith('.')) {
                return `<p>${trimmed}.</p>`;
            } else if (trimmed) {
                return `<p>${trimmed}</p>`;
            }
            return '';
        }).filter(p => p);
        
        return paragraphs.join('');
    }
}

// ===================================================================
// PROGRAMA PRINCIPAL
// ===================================================================
class ImperiumProgram {
    static ensureParseButtonVisible() {
        if (!game.user.isGM && !Actor.canUserCreate(game.user)) {
            return;
        }

        let parseButton = document.getElementById("IMPMAL-parse-button");
        if (parseButton != null) {
            return;
        }

        const actorsPanel = document.getElementById("actors");
        const actorFooter = actorsPanel?.getElementsByClassName("directory-footer")[0];
        if (actorFooter) {
            ImperiumUtils.log("Creating Imperium Parse button.");

            parseButton = document.createElement("button");
            parseButton.innerHTML = `<i id="IMPMAL-parse-button" class="fas fa-skull"></i>Parse Imperium Content`;
            parseButton.onclick = ev => ImperiumProgram.openParser();

            const createEntityButton = actorFooter.getElementsByClassName("create-entity")[0];
            actorFooter.insertBefore(parseButton, createEntityButton);
        }
    }

    static async openParser(folderId = null) {
        ImperiumUtils.log("Opening Imperium Parser. Target folder: " + (folderId || "none"));

        const html = `
        <form id="impmal-input-form">
            <div class="form-group">
                <label>Content Type:</label>
                <select id="content-type" style="width: 100%; padding: 5px; margin-bottom: 10px;">
                    <option value="npc">NPCs / Creatures</option>
                    <option value="power">Psychic Powers</option>
                    <option value="talent">Talents</option>
                    <option value="boon">Boons & Liabilities</option>
                    <option value="vehicle">Vehicles</option>
                </select>
            </div>
            <div class="form-group" id="autocalc-settings">
                <label>AutoCalc Settings:</label>
                <div style="margin-bottom: 10px;">
                    <label style="margin-right: 15px;">
                        <input type="checkbox" name="autoCalcWounds" id="auto-calc-wounds" checked> Wounds
                    </label>
                    <label style="margin-right: 15px;">
                        <input type="checkbox" name="autoCalcCriticals" id="auto-calc-criticals" checked> Criticals
                    </label>
                    <label>
                        <input type="checkbox" name="autoCalcInitiative" id="auto-calc-initiative" checked> Initiative
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label id="input-label">Introduce el texto:</label>
                <textarea id="impmal-text" rows="15" style="width: 100%; font-family: monospace;" placeholder=""></textarea>
                <small id="format-hint" style="display: block; margin-top: 5px; color: #666;"></small>
            </div>
        </form>
        <script>
            const contentType = document.getElementById('content-type');
            const autoCalcSettings = document.getElementById('autocalc-settings');
            const inputLabel = document.getElementById('input-label');
            const textarea = document.getElementById('impmal-text');
            const formatHint = document.getElementById('format-hint');
            
            const placeholders = {
                npc: "Chaos Beastman\\nMedium Beastman (Heretic), Troop\\nWS  BS  Str Tgh Ag  Int Per Wil Fel\\n40  30  40  40  30  20  30  30  10\\nArmour Wounds Critical Wounds\\n3 15 3\\nInitiative Speed Resolve\\n6 Normal 4\\nSkills: Athletics 45, Awareness 35\\nTRAITS\\nBestial: The creature is an animal.\\nATTACKS\\nHorns: Melee (Brawling) 5 + SL Damage\\nPossessions: Crude armor\\nNOTES\\nChaos Beastmen are twisted creatures...",
                power: "*Pyromancy Powers\\nºpyromancy\\n\\nPLASMA TORCH\\nCognomens: The Searing Touch\\nWarp Rating: 2\\nDifficulty: Challenging (+0)\\nRange: Self\\nTarget: Self\\nDuration: Sustained\\nYour hand becomes wreathed...",
                talent: "TENACIOUS\\nIt's tough to keep you down. Whenever you suffer\\nthe Stunned Condition, you may immediately\\nmake a Challenging (+0) Fortitude (Endurance)\\nTest to recover from the Condition.",
                boon: "ºboon\\nAMELIORATOR\\nYour Patron is obsessed with improving both\\nyour weapons and your bodies...\\n\\nºliability\\nPARANOID\\nYour Patron trusts no one...",
                vehicle: "CARGO HAULER\\nVehicle, Wheeled\\nArmour Speed Crew\\n10/6 Slow 1\\nPassengers Size\\n3 Large\\nTRAITS\\n...\\nWEAPONS\\nStubber (Crew): Ranged (Projectile) 5 Damage Short Range...\\nNOTES\\nA sturdy cargo vehicle..."
            };
            
            const hints = {
                npc: "Name detection is automatic. Separate creatures with blank lines.",
                power: "Use *FolderName for folders | Use ºdiscipline to set power type (pyromancy, minor, biomancy, divination, telekinesis, telepathy, waaagh, or leave empty) | Add * to power name for Overt powers",
                talent: "Use *FolderName for folders | Talents detected by UPPERCASE name lines",
                boon: "Use *FolderName for folders | Use ºcategory to set type (boon, liability) | Default: boon",
                vehicle: "Use *FolderName for folders | Vehicles detected by 'Vehicle, Type' line"
            };
            
            const labels = {
                npc: "NPCs / Creatures:",
                power: "Psychic Powers:",
                talent: "Talents:",
                boon: "Boons & Liabilities:",
                vehicle: "Vehicles:"
            };
            
            contentType.addEventListener('change', function() {
                const type = this.value;
                autoCalcSettings.style.display = type === 'npc' ? 'block' : 'none';
                inputLabel.textContent = labels[type];
                textarea.placeholder = placeholders[type];
                formatHint.textContent = hints[type];
            });
            
            // Trigger initial setup
            contentType.dispatchEvent(new Event('change'));
        </script>
        `;

        const result = await Dialog.prompt({
            title: "Parse Imperium Maledictum Content",
            content: html,
            label: "Parse",
            callback: (html) => {
                return {
                    contentType: html.find('#content-type').val(),
                    text: html.find('#impmal-text').val(),
                    autoCalcWounds: html.find('#auto-calc-wounds').prop('checked'),
                    autoCalcCriticals: html.find('#auto-calc-criticals').prop('checked'),
                    autoCalcInitiative: html.find('#auto-calc-initiative').prop('checked')
                };
            },
            rejectClose: false
        });

        if (!result || !result.text) {
            return;
        }

        let parser;
        let parseResult;
        let entityType;
        let entityLabel;

        if (result.contentType === 'npc') {
            parser = new ImperiumCreatureParser();
            parseResult = await parser.parseInput(result.text.trim(), {
                autoCalcWounds: result.autoCalcWounds,
                autoCalcCriticals: result.autoCalcCriticals,
                autoCalcInitiative: result.autoCalcInitiative
            });
            entityType = Actor;
            entityLabel = "NPC";
        } else if (result.contentType === 'power') {
            parser = new ImperiumPowerParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Psychic Power";
        } else if (result.contentType === 'talent') {
            parser = new ImperiumTalentParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Talent";
        } else if (result.contentType === 'boon') {
            parser = new ImperiumBoonParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Boon/Liability";
        } else if (result.contentType === 'vehicle') {
            parser = new ImperiumVehicleParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Actor;
            entityLabel = "Vehicle";
        } else {
            ui.notifications.error("Unknown content type");
            return;
        }

        if (!parseResult.success) {
            ui.notifications.error(`Error: ${parseResult.error}`);
            return;
        }

        if (parseResult.errors.length > 0) {
            let errorMessage = "There were " + parseResult.errors.length + " issue(s):<br/>";
            for (let error of parseResult.errors) {
                errorMessage += `${error[0]}: ${error[1]}<br/>`;
            }
            ui.notifications.warn(errorMessage, { permanent: true });
        }

        const items = (result.contentType === 'npc' || result.contentType === 'vehicle') ? parseResult.creatures || parseResult.items : parseResult.items;

        for (const itemData of items) {
            try {
                ImperiumUtils.log(`Creating ${entityLabel}: ${itemData.name}`);
                
                if (folderId) {
                    itemData.folder = folderId;
                }

                const entity = await entityType.create(itemData);
                
                if (entity) {
                    ui.notifications.info(`${entityLabel} created: ${entity.name}`);
                } else {
                    ui.notifications.error(`Error creating: ${itemData.name}`);
                }
            } catch (error) {
                ImperiumUtils.log(`Error creating ${entityLabel} ${itemData.name}: ${error.message}`);
                ui.notifications.error(`Error: ${itemData.name} - ${error.message}`);
            }
        }

        ui.notifications.info(`${items.length} ${entityLabel}(s) processed!`);
    }
}

// ===================================================================
// HOOKS DE FOUNDRY
// ===================================================================
Hooks.on("renderSidebarTab", async (app, html) => {
    if (app.options.id == "actors") {
        ImperiumProgram.ensureParseButtonVisible();
    }
});

Hooks.on("changeSidebarTab", async (app) => {
    if (app.id == "actors") {
        ImperiumProgram.ensureParseButtonVisible();
    }
});

Hooks.on("renderActorDirectory", async (app, html) => {
    ImperiumProgram.ensureParseButtonVisible();
});

Hooks.on("getActorDirectoryFolderContext", async (html, folderOptions) => {
    folderOptions.push({
        name: "Parse Imperium Content",
        icon: '<i class="fas fa-skull"></i>',
        condition: game.user.isGM,
        callback: header => {
            const li = header.parent();
            ImperiumProgram.openParser(li.data("folderId"));
        }
    });
});

Hooks.on("getItemDirectoryFolderContext", async (html, folderOptions) => {
    folderOptions.push({
        name: "Parse Imperium Content",
        icon: '<i class="fas fa-brain"></i>',
        condition: game.user.isGM,
        callback: header => {
            const li = header.parent();
            ImperiumProgram.openParser(li.data("folderId"));
        }
    });
});

Hooks.on("ready", function() {
    ImperiumUtils.log("Imperium Maledictum Parser initialized.");
});
