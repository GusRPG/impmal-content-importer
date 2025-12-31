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
// AUGMETIC PARSER
// ===================================================================
class ImperiumAugmeticParser {
    async parseInput(text) {
        const lines = ImperiumUtils.splitLines(text);
        const items = [];
        const errors = [];
        let currentFolder = null;
        
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Folder marker
            if (line.startsWith('*')) {
                currentFolder = line.substring(1).trim();
                i++;
                continue;
            }
            
            // Detect augmetic name (all uppercase line)
            if (line && line === line.toUpperCase() && line.length > 0 && /[A-Z]/.test(line)) {
                const augmeticName = line;
                const descriptionLines = [];
                i++;
                
                // Collect description lines until next uppercase line or folder marker
                while (i < lines.length) {
                    const nextLine = lines[i].trim();
                    if (nextLine.startsWith('*')) break;
                    if (nextLine && nextLine === nextLine.toUpperCase() && /[A-Z]/.test(nextLine)) break;
                    if (nextLine) descriptionLines.push(nextLine);
                    i++;
                }
                
                if (descriptionLines.length > 0) {
                    const augmetic = this.parseAugmetic(augmeticName, descriptionLines, currentFolder);
                    if (augmetic) items.push(augmetic);
                }
            } else {
                i++;
            }
        }
        
        return { success: true, items: items, errors: errors };
    }
    
    parseAugmetic(name, descriptionLines, folder = null) {
        const description = this.formatDescription(descriptionLines.join('\n'));
        const now = Date.now();
        
        return {
            name: name,
            type: "augmetic",
            img: "modules/impmal-core/assets/icons/augmetics/augmetic.webp",
            folder: folder,
            system: {
                notes: { player: description, gm: "" },
                encumbrance: { value: 0 },
                cost: 0,
                availability: "",
                quantity: 1,
                equipped: { value: false, force: false },
                slots: { list: [], value: 0 },
                traits: { list: [] }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }
    
    formatDescription(text) {
        let combined = text.replace(/\n/g, ' ').trim().replace(/\s+/g, ' ');
        const parts = combined.split('💀').map(p => p.trim()).filter(p => p);
        const paragraphs = [];
        
        parts.forEach((part, index) => {
            if (index === 0 && !combined.startsWith('💀')) {
                const sentences = part.split(/\.(?=\s+[A-Z])/);
                sentences.forEach(sentence => {
                    const trimmed = sentence.trim();
                    if (!trimmed) return;
                    if (!trimmed.endsWith('.')) {
                        paragraphs.push(`<p>${trimmed}.</p>`);
                    } else {
                        paragraphs.push(`<p>${trimmed}</p>`);
                    }
                });
            } else {
                const trimmed = part.trim();
                if (!trimmed) return;
                if (!trimmed.endsWith('.')) {
                    paragraphs.push(`<p>💀 ${trimmed}.</p>`);
                } else {
                    paragraphs.push(`<p>💀 ${trimmed}</p>`);
                }
            }
        });
        
        return paragraphs.join('');
    }
}

// ===================================================================
// WEAPON PARSER
// ===================================================================
// ===================================================================
// WEAPON PARSER (MEJORADO - con categorías y soporte completo ranged)
// ===================================================================
class ImperiumWeaponParser {
    async parseInput(text) {
        const lines = ImperiumUtils.splitLines(text);
        const items = [];
        const errors = [];
        let currentFolder = null;
        let currentWeaponType = "solid"; // Default category
        
        const validCategories = ['bolt', 'flame', 'las', 'launcher', 'melta', 'plasma', 'solid', 'specialised', 'grenadesExplosives', 'mundane', 'exotic'];
        
        lines.forEach(line => {
            line = line.trim();
            
            // Category marker (ºcategory)
            if (line.startsWith('º')) {
                const weaponType = line.substring(1).trim().toLowerCase();
                if (validCategories.includes(weaponType)) {
                    currentWeaponType = weaponType;
                    ImperiumUtils.log(`Set weapon category to: ${currentWeaponType}`);
                } else {
                    errors.push([line, `Invalid weapon category "${weaponType}". Valid: ${validCategories.join(', ')}`]);
                }
                return;
            }
            
            // Folder marker (*FolderName)
            if (line.startsWith('*')) {
                currentFolder = line.substring(1).trim();
                ImperiumUtils.log(`Set folder to: ${currentFolder}`);
                return;
            }
            
            const weapons = this.parseWeapon(line, currentWeaponType, currentFolder);
            if (weapons) {
                if (Array.isArray(weapons)) {
                    items.push(...weapons);
                } else {
                    items.push(weapons);
                }
            } else {
                errors.push([line, "Failed to parse weapon line"]);
            }
        });
        
        return { success: true, items: items, errors: errors };
    }
    
    parseWeapon(line, weaponType = "solid", folder = null) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return null;
        
        // Buscar el índice del DAMAGE (primer número o patrón X+CharB)
        let damageIdx = -1;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (/^\d+$/.test(part) || /^\d+\+\w+B$/i.test(part) || /^\d+d\d+$/.test(part)) {
                damageIdx = i;
                break;
            }
        }
        
        if (damageIdx === -1 || damageIdx < 2) return null;
        
        // SPEC es la palabra justo antes del damage
        const specIdx = damageIdx - 1;
        let spec = parts[specIdx].toLowerCase();
        
        // NAME es todo antes del spec
        let name = parts.slice(0, specIdx).join(' ');
        
        // Verificar specs de dos palabras
        const twoWordSpecs = ['long gun', 'las gun', 'melta gun', 'plasma gun', 'stub gun'];
        if (specIdx > 0) {
            const possibleTwoWord = (parts[specIdx - 1] + ' ' + parts[specIdx]).toLowerCase();
            if (twoWordSpecs.includes(possibleTwoWord)) {
                spec = possibleTwoWord;
                name = parts.slice(0, specIdx - 1).join(' ');
            }
        }
        
        if (!name) return null;
        
        // Normalizar spec
        if (spec === 'one-handed') spec = 'oneHanded';
        if (spec === 'two-handed') spec = 'twoHanded';
        if (spec === 'long gun') spec = 'longGun';
        if (spec === 'las gun') spec = 'lasGun';
        if (spec === 'melta gun') spec = 'meltaGun';
        if (spec === 'plasma gun') spec = 'plasmaGun';
        if (spec === 'stub gun') spec = 'stubGun';
        
        // Determinar si es melee o ranged
        const meleeSpecs = ['onehanded', 'twohanded', 'brawling'];
        const isRanged = !meleeSpecs.includes(spec);
        const attackType = isRanged ? "ranged" : "melee";
        
        // Parsear desde damageIdx
        let idx = damageIdx;
        
        // DAMAGE
        let damageOptions = [];
        let damageStr = parts[idx];
        idx++;
        
        // Verificar "or" para múltiples opciones
        if (idx < parts.length && parts[idx].toLowerCase() === 'or') {
            idx++;
            if (idx < parts.length) {
                const secondDamage = parts[idx];
                damageOptions.push(damageStr);
                damageOptions.push(secondDamage);
                idx++;
            }
        } else {
            damageOptions.push(damageStr);
        }
        
        // Si hay múltiples opciones de daño, crear múltiples armas
        if (damageOptions.length > 1) {
            const weapons = [];
            damageOptions.forEach(dmgOpt => {
                const parsedDamage = this.parseDamage(dmgOpt);
                if (parsedDamage) {
                    const weapon = this.createWeaponObject(
                        name, spec, parsedDamage, parts, idx, 
                        attackType, true, weaponType, folder
                    );
                    if (weapon) weapons.push(weapon);
                }
            });
            return weapons;
        } else {
            const parsedDamage = this.parseDamage(damageOptions[0]);
            if (!parsedDamage) return null;
            return this.createWeaponObject(
                name, spec, parsedDamage, parts, idx, 
                attackType, false, weaponType, folder
            );
        }
    }
    
    parseDamage(damageStr) {
        let damageBase = "0";
        let damageChar = "";
        let damageSL = false;
        
        const charBonusMatch = damageStr.match(/(\d+)\+(StrB|AgB|TghB|WilB|IntB|PerB|BSB|WSB|FelB)/i);
        if (charBonusMatch) {
            damageBase = charBonusMatch[1];
            const bonus = charBonusMatch[2].toLowerCase();
            const charMap = {
                'strb': 'str', 'agb': 'ag', 'tghb': 'tgh', 'wilb': 'wil',
                'intb': 'int', 'perb': 'per', 'bsb': 'bs', 'wsb': 'ws', 'felb': 'fel'
            };
            damageChar = charMap[bonus] || "";
        } else if (damageStr.includes('d')) {
            damageBase = damageStr;
        } else {
            damageBase = damageStr;
        }
        
        return { base: damageBase, characteristic: damageChar, SL: damageSL };
    }
    
    createWeaponObject(baseName, spec, damage, parts, startIdx, attackType, addSuffix = false, weaponType = "solid", folder = null) {
        let idx = startIdx;
        
        // Lista de traits válidos
        const validTraits = [
            'blast', 'burst', 'close', 'defensive', 'flamer', 'heavy',
            'ineffective', 'inflict', 'loud', 'penetrating', 'rapidfire', 'rapid fire',
            'reach', 'reliable', 'rend', 'shield', 'spread', 'subtle',
            'supercharge', 'thrown', 'twohanded', 'two-handed', 'unstable',
            'twinlinked', 'twin-linked', 'parry', 'proven', 'unwieldy',
            'bulky', 'shoddy', 'ugly', 'unreliable', 'lightweight',
            'mastercrafted', 'ornamental', 'durable', 'melta', 'spray', 'flame'
        ];
        
        let name = baseName;
        if (addSuffix && damage.characteristic) {
            name += ` (${damage.characteristic.toUpperCase()})`;
        }
        
        let range = "";
        let mag = 1;
        
        // Para armas ranged, parsear range y mag
        if (attackType === "ranged") {
            if (idx >= parts.length) return null;
            range = parts[idx].toLowerCase();
            const validRanges = ['short', 'medium', 'long', 'extreme'];
            if (!validRanges.includes(range)) return null;
            idx++;
            
            if (idx >= parts.length) return null;
            mag = parseInt(parts[idx]) || 1;
            idx++;
        }
        
        // ENCUMBRANCE
        if (idx >= parts.length) return null;
        const encumbrance = parseInt(parts[idx]) || 0;
        idx++;
        
        // COST (puede incluir ammoCost entre paréntesis)
        if (idx >= parts.length) return null;
        let costStr = parts[idx];
        let ammoCost = 0;
        idx++;
        
        // Si la siguiente palabra empieza con '(', es el ammoCost
        if (idx < parts.length && parts[idx].startsWith('(')) {
            costStr += parts[idx];
            idx++;
        }
        
        const costMatch = costStr.match(/^([\d,]+)(?:\((\d+(?:,\d+)?)\))?$/);
        if (!costMatch) return null;
        
        const cost = parseInt(costMatch[1].replace(/,/g, '')) || 0;
        ammoCost = costMatch[2] ? parseInt(costMatch[2].replace(/,/g, '')) : 0;
        
        // AVAILABILITY
        if (idx >= parts.length) return null;
        const availabilityKeywords = ['common', 'scarce', 'rare', 'exotic'];
        let availability = '';
        while (idx < parts.length) {
            const lower = parts[idx].toLowerCase();
            if (availabilityKeywords.includes(lower)) {
                availability = lower;
                idx++;
                break;
            }
            idx++;
        }
        if (!availability) return null;
        
        // TRAITS - parsear solo traits válidos
        const traitsRaw = parts.slice(idx);
        const traitsArray = [];
        let i = 0;
        
        while (i < traitsRaw.length) {
            const word = traitsRaw[i];
            const cleanWord = word.replace(/[(),]/g, '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
            
            // Verificar si es un trait válido
            const isValidTrait = validTraits.some(vt => vt.replace(/\s+/g, '').replace(/-/g, '') === cleanWord);
            
            if (!isValidTrait) {
                break; // Ya no es un trait, parar
            }
            
            let traitStr = word;
            
            // Si tiene paréntesis abierto pero no cerrado, continuar
            if (word.includes('(') && !word.includes(')')) {
                i++;
                while (i < traitsRaw.length && !traitsRaw[i - 1].includes(')')) {
                    traitStr += ' ' + traitsRaw[i];
                    i++;
                }
            }
            // Si la siguiente palabra es un paréntesis con valor
            else if (i + 1 < traitsRaw.length && /^\([^)]+\)/.test(traitsRaw[i + 1])) {
                traitStr += ' ' + traitsRaw[i + 1];
                i++;
            }
            
            // Limpiar comas al final
            traitStr = traitStr.replace(/,$/, '');
            traitsArray.push(traitStr);
            i++;
        }
        
        const traits = this.parseWeaponTraitsFromArray(traitsArray);
        
        const now = Date.now();
        return {
            name: name,
            type: "weapon",
            img: attackType === "ranged" ? 
                "modules/impmal-core/assets/icons/weapons/ranged-weapon.webp" : 
                "modules/impmal-core/assets/icons/weapons/melee-weapon.webp",
            folder: folder,
            system: {
                notes: { player: "", gm: "" },
                encumbrance: { value: encumbrance },
                cost: cost,
                availability: availability,
                quantity: 1,
                equipped: { value: false, force: false },
                damage: {
                    base: damage.base,
                    characteristic: damage.characteristic,
                    SL: damage.SL,
                    ignoreAP: false
                },
                traits: { list: traits },
                ammoCost: ammoCost,
                attackType: attackType,
                category: weaponType,
                spec: spec,
                range: range,
                rangeModifier: { value: 0, override: "" },
                mag: { "value": mag, current: 0 },
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
    
    parseWeaponTraitsFromArray(traitsArray) {
        const traits = [];
        const twoWordTraits = ['rapid fire', 'twin-linked', 'twin linked'];
        const traitsWithValue = ['heavy', 'inflict', 'penetrating', 'rapidfire', 'rend', 'shield', 'supercharge', 'thrown'];
        
        let i = 0;
        while (i < traitsArray.length) {
            let traitStr = traitsArray[i];
            
            // Verificar traits de dos palabras
            if (i + 1 < traitsArray.length) {
                const nextPart = traitsArray[i + 1];
                const twoWordBase = (traitStr + ' ' + nextPart.replace(/\s*\([^)]*\)/, '')).toLowerCase().trim();
                
                if (twoWordTraits.includes(twoWordBase)) {
                    traitStr = traitStr + ' ' + nextPart;
                    i++;
                }
            }
            
            const match = traitStr.match(/^(.+?)\s*\(([^)]+)\)$/);
            
            if (match) {
                const key = ImperiumUtils.normalizeTraitKey(match[1]);
                if (traitsWithValue.includes(key.toLowerCase())) {
                    traits.push({ key: key, value: match[2] });
                } else {
                    traits.push({ key: key });
                }
            } else {
                const cleanTrait = traitStr.replace(/[,.]$/, '').trim();
                if (cleanTrait) {
                    const key = ImperiumUtils.normalizeTraitKey(cleanTrait);
                    traits.push({ key: key });
                }
            }
            
            i++;
        }
        
        return traits;
    }
}
class ImperiumArmourParser {
    async parseInput(text) {
        const lines = ImperiumUtils.splitLines(text);
        const items = [];
        const errors = [];
        let currentFolder = null;
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.startsWith('*')) {
                currentFolder = line.substring(1).trim();
                return;
            }
            
            const armour = this.parseArmour(line, currentFolder);
            if (armour) items.push(armour);
        });
        
        return { success: true, items: items, errors: errors };
    }
    
    parseArmour(line, folder = null) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return null;
        
        // Buscar availability
        const validAvailabilities = ['common', 'scarce', 'rare', 'exotic'];
        let availIdx = -1;
        for (let i = 0; i < parts.length; i++) {
            if (validAvailabilities.includes(parts[i].toLowerCase())) {
                availIdx = i;
                break;
            }
        }
        if (availIdx < 4) return null;
        
        // Cost (antes de availability)
        const costIdx = availIdx - 1;
        if (!/^[\d,]+$/.test(parts[costIdx])) return null;
        const cost = parseInt(parts[costIdx].replace(/,/g, '')) || 0;
        
        // Encumbrance (antes de cost)
        const encIdx = costIdx - 1;
        let encStr = parts[encIdx];
        if (encIdx + 1 < costIdx && /^\([\d,]+\)$/.test(parts[encIdx + 1])) {
            encStr += parts[encIdx + 1];
        }
        const encNumbers = encStr.match(/\d+/g);
        if (!encNumbers || encNumbers.length === 0) return null;
        const encumbrance = Math.max(...encNumbers.map(n => parseInt(n)));
        
        // Armour (antes de encumbrance)
        let armourIdx = encIdx - 1;
        if (encIdx + 1 < costIdx && /^\([\d,]+\)$/.test(parts[encIdx + 1])) {
            armourIdx = encIdx - 2;
        }
        let armourStr = parts[armourIdx];
        const armourNumbers = armourStr.match(/\d+/g);
        if (!armourNumbers || armourNumbers.length === 0) return null;
        const armour = Math.max(...armourNumbers.map(n => parseInt(n)));
        
        // Locations
        const locationMap = {
            'head': ['head'],
            'body': ['body'],
            'arms': ['rightArm', 'leftArm'],
            'rightarm': ['rightArm'],
            'leftarm': ['leftArm'],
            'legs': ['rightLeg', 'leftLeg'],
            'rightleg': ['rightLeg'],
            'leftleg': ['leftLeg'],
            'all': ['rightLeg', 'leftLeg', 'rightArm', 'leftArm', 'body', 'head']
        };
        
        let locationsIdx = -1;
        let locationsEndIdx = -1;
        
        for (let i = armourIdx - 1; i >= 0; i--) {
            const word = parts[i];
            const subParts = word.split(',').map(p => p.trim().toLowerCase());
            const allAreLocations = subParts.every(p => p === '' || locationMap[p]);
            const hasAtLeastOneLocation = subParts.some(p => locationMap[p]);
            
            if (hasAtLeastOneLocation && allAreLocations) {
                if (locationsIdx === -1) {
                    locationsIdx = i;
                    locationsEndIdx = i;
                } else {
                    locationsIdx = i;
                }
            } else {
                if (locationsIdx !== -1) break;
            }
        }
        
        if (locationsIdx === -1) return null;
        
        let locationsStr = parts.slice(locationsIdx, locationsEndIdx + 1).join(' ');
        const locationParts = locationsStr.toLowerCase().split(/[,\s]+/).filter(p => p);
        let locationsList = [];
        locationParts.forEach(loc => {
            const mapped = locationMap[loc.trim()];
            if (mapped) locationsList = locationsList.concat(mapped);
        });
        locationsList = [...new Set(locationsList)];
        
        let locationsLabel = locationsList.length === 6 ? 'All' : locationsStr;
        
        const name = parts.slice(0, locationsIdx).join(' ');
        if (!name) return null;
        
        const availability = parts[availIdx].toLowerCase();
        
        // TRAITS
        const validTraits = [
            'blast', 'burst', 'close', 'defensive', 'flamer', 'heavy',
            'ineffective', 'inflict', 'loud', 'penetrating', 'rapidfire',
            'reach', 'reliable', 'rend', 'shield', 'spread', 'subtle',
            'supercharge', 'thrown', 'twohanded', 'two-handed', 'unstable'
        ];
        
        let traitsEnd = availIdx + 1;
        let isDash = false;
        
        if (traitsEnd < parts.length && /^[-–—]$/.test(parts[traitsEnd])) {
            traitsEnd++;
            isDash = true;
        } else {
            while (traitsEnd < parts.length) {
                const word = parts[traitsEnd];
                const cleanWord = word.replace(/[(),]/g, '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
                
                const isValidTrait = validTraits.includes(cleanWord);
                const hasParenOrComma = /[(),]/.test(word);
                
                if (isValidTrait || hasParenOrComma) {
                    traitsEnd++;
                    if (word.includes('(') && !word.includes(')')) {
                        while (traitsEnd < parts.length && !parts[traitsEnd - 1].includes(')')) {
                            traitsEnd++;
                        }
                    }
                    continue;
                }
                break;
            }
        }
        
        let traits = [];
        if (!isDash) {
            const traitsRaw = parts.slice(availIdx + 1, traitsEnd).join(' ');
            if (traitsRaw && traitsRaw.trim()) {
                traits = this.parseArmourTraits(traitsRaw);
            }
        }
        
        let description = '';
        if (traitsEnd < parts.length) {
            description = parts.slice(traitsEnd).join(' ');
        }
        
        const notesHtml = description ? `<p>${description}</p>` : '';
        
        let category = 'other';
        const nameLower = name.toLowerCase();
        if (nameLower.includes('mesh')) category = 'mesh';
        else if (nameLower.includes('flak')) category = 'flak';
        else if (nameLower.includes('carapace')) category = 'carapace';
        else if (nameLower.includes('power')) category = 'power';
        else if (armour >= 10) category = 'power';
        else if (armour >= 6) category = 'carapace';
        else if (armour >= 4) category = 'flak';
        else if (armour >= 2) category = 'mesh';
        
        const now = Date.now();
        return {
            name: name,
            type: "protection",
            img: "modules/impmal-core/assets/icons/protection/armour.webp",
            folder: folder,
            system: {
                notes: { player: notesHtml, gm: "" },
                encumbrance: { value: encumbrance },
                cost: cost,
                availability: availability,
                quantity: 1,
                equipped: { value: false, force: false },
                traits: { list: traits },
                category: category,
                armour: armour,
                locations: {
                    list: locationsList,
                    label: locationsLabel
                },
                damage: {},
                rended: {},
                slots: { list: [], value: 0 },
                mods: { list: [] }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
    }
    
    parseArmourTraits(traitsText) {
        const traits = [];
        if (!traitsText || !traitsText.trim()) return traits;
        
        const cleanedText = traitsText.replace(/,(?!\s)/g, ', ');
        const traitGroups = cleanedText.split(',').map(t => t.trim());
        
        traitGroups.forEach(group => {
            if (!group || group === '-' || /^[-–—]$/.test(group)) return;
            
            const parenMatch = group.match(/^(.+?)\s*\(([^)]+)\)$/);
            if (parenMatch) {
                const key = parenMatch[1].trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
                const value = parenMatch[2].trim();
                traits.push({ key: key, value: value });
                return;
            }
            
            const cleanKey = group.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
            if (cleanKey && cleanKey !== '(' && cleanKey !== ')') {
                traits.push({ key: cleanKey });
            }
        });
        
        return traits;
    }
}

// ===================================================================
// EXPLOSIVE PARSER
// ===================================================================
class ImperiumExplosiveParser {
    async parseInput(text) {
        const lines = ImperiumUtils.splitLines(text);
        const items = [];
        const errors = [];
        let currentFolder = null;
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.startsWith('*')) {
                currentFolder = line.substring(1).trim();
                return;
            }
            
            const explosive = this.parseExplosive(line, currentFolder);
            if (explosive) items.push(explosive);
        });
        
        return { success: true, items: items, errors: errors };
    }
    
    parseExplosive(line, folder = null) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return null;
        
        // Buscar availability
        const validAvailabilities = ['common', 'scarce', 'rare', 'exotic'];
        let availIdx = -1;
        for (let i = 0; i < parts.length; i++) {
            if (validAvailabilities.includes(parts[i].toLowerCase())) {
                availIdx = i;
                break;
            }
        }
        if (availIdx < 4) return null;
        
        // Cost
        const costIdx = availIdx - 1;
        if (!/^[\d,]+$/.test(parts[costIdx])) return null;
        const cost = parseInt(parts[costIdx].replace(/,/g, '')) || 0;
        
        // Encumbrance
        const encIdx = costIdx - 1;
        if (!/^[\d,]+$/.test(parts[encIdx])) return null;
        const encumbrance = parseInt(parts[encIdx].replace(/,/g, '')) || 0;
        
        // Damage (opcional)
        let damageIdx = encIdx - 1;
        let damageBase = '';
        if (damageIdx >= 0) {
            const dmgPart = parts[damageIdx];
            if (dmgPart === '-' || dmgPart === '–' || dmgPart === '0') {
                damageBase = '0';
            } else if (/^\d+$/.test(dmgPart)) {
                damageBase = dmgPart;
            } else {
                damageIdx = encIdx;
            }
        } else {
            damageIdx = encIdx;
        }
        
        // Spec
        let specIdx = damageIdx - 1;
        let spec = '';
        
        if (specIdx >= 0) {
            const word1 = parts[specIdx].toLowerCase();
            if (word1 === 'ordnance' && specIdx > 0 && parts[specIdx - 1].toLowerCase() === 'thrown') {
                spec = 'thrown';
                specIdx = specIdx - 1;
            } else if (word1 === 'ordnance') {
                spec = 'ordnance';
            } else if (word1 === 'thrown') {
                spec = 'thrown';
            }
        }
        
        if (!spec) return null;
        
        const name = parts.slice(0, specIdx).join(' ');
        if (!name) return null;
        
        const availability = parts[availIdx].toLowerCase();
        
        // TRAITS
        const commonTraits = ['blast', 'loud', 'inflict', 'haywire', 'penetrating', 'spread',
            'unstable', 'thrown', 'flame', 'spray', 'melta', 'rapid', 'fire',
            'heavy', 'reliable', 'unreliable', 'proven', 'rend', 'shield'];
        
        let traitsEnd = availIdx + 1;
        while (traitsEnd < parts.length) {
            const word = parts[traitsEnd];
            const wordLower = word.toLowerCase().replace(/[()]/g, '');
            
            if (commonTraits.some(t => wordLower.includes(t))) {
                traitsEnd++;
                if (word.includes('(') && !word.includes(')')) {
                    while (traitsEnd < parts.length && !parts[traitsEnd - 1].includes(')')) {
                        traitsEnd++;
                    }
                }
            } else if (/^\([^)]+\)$/.test(word)) {
                traitsEnd++;
            } else if (traitsEnd > availIdx + 1 && parts[traitsEnd - 1].includes('(') && !parts[traitsEnd - 1].includes(')')) {
                traitsEnd++;
            } else {
                break;
            }
        }
        
        const traitsRaw = parts.slice(availIdx + 1, traitsEnd).join(' ');
        const traits = this.parseWeaponTraits(traitsRaw);
        
        let description = '';
        if (traitsEnd < parts.length) {
            description = parts.slice(traitsEnd).join(' ');
        }
        
        const notesHtml = description ? `<p>${description}</p>` : '';
        
        // Determinar range desde traits
        let range = 'medium';
        const thrownTrait = traits.find(t => t.key === 'thrown');
        if (thrownTrait && thrownTrait.value) {
            range = thrownTrait.value.toLowerCase();
        }
        
        const now = Date.now();
        return {
            name: name,
            type: "weapon",
            img: "modules/impmal-core/assets/icons/weapons/ranged-weapon.webp",
            folder: folder,
            system: {
                notes: { player: notesHtml, gm: "" },
                encumbrance: { value: encumbrance },
                cost: cost,
                availability: availability,
                quantity: 1,
                equipped: { value: false, force: false },
                damage: {
                    base: damageBase,
                    characteristic: "",
                    SL: false,
                    ignoreAP: false
                },
                traits: { list: traits },
                ammoCost: null,
                attackType: "ranged",
                category: "grenadesExplosives",
                spec: spec,
                range: range,
                rangeModifier: { value: 0, override: "" },
                mag: { value: null, current: null },
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
    
    parseWeaponTraits(traitsText) {
        const traits = [];
        if (!traitsText || !traitsText.trim()) return traits;
        
        const parts = traitsText.split(/\s+/);
        const traitsWithValue = ['heavy', 'inflict', 'penetrating', 'rapidfire', 'rend', 'shield', 'supercharge', 'thrown', 'haywire'];
        
        let i = 0;
        while (i < parts.length) {
            const part = parts[i];
            
            const parenMatch = part.match(/^(.+?)\(([^)]+)\)$/);
            if (parenMatch) {
                const key = parenMatch[1].toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
                if (traitsWithValue.includes(key)) {
                    traits.push({ key: key, value: parenMatch[2] });
                } else {
                    traits.push({ key: key });
                }
                i++;
            } else if (i + 1 < parts.length && /^\([^)]+\)$/.test(parts[i + 1])) {
                const key = part.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
                const value = parts[i + 1].replace(/[()]/g, '');
                if (traitsWithValue.includes(key)) {
                    traits.push({ key: key, value: value });
                } else {
                    traits.push({ key: key });
                }
                i += 2;
            } else {
                const cleanPart = part.replace(/\.$/, '').trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
                if (cleanPart && cleanPart !== '(' && cleanPart !== ')') {
                    traits.push({ key: cleanPart });
                }
                i++;
            }
        }
        
        return traits;
    }
}

// ===================================================================
// EQUIPMENT PARSER
// ===================================================================
class ImperiumEquipmentParser {
    async parseInput(text) {
        const lines = ImperiumUtils.splitLines(text);
        const items = [];
        const errors = [];
        let currentFolder = null;
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.startsWith('*')) {
                currentFolder = line.substring(1).trim();
                return;
            }
            
            const equipment = this.parseEquipment(line, currentFolder);
            if (equipment) items.push(equipment);
        });
        
        return { success: true, items: items, errors: errors };
    }
    
    parseEquipment(line, folder = null) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) return null;
        
        // Buscar el índice del COST (primer número)
        let costIdx = -1;
        for (let i = 0; i < parts.length; i++) {
            if (/^[\d,]+$/.test(parts[i])) {
                costIdx = i;
                break;
            }
        }
        
        if (costIdx === -1 || costIdx < 1) return null;
        
        // NAME es todo antes del cost
        const name = parts.slice(0, costIdx).join(' ');
        
        // COST
        const cost = parseInt(parts[costIdx].replace(/,/g, '')) || 0;
        
        // AVAILABILITY
        if (costIdx + 1 >= parts.length) return null;
        const availability = parts[costIdx + 1].toLowerCase();
        const validAvailabilities = ['common', 'scarce', 'rare', 'exotic'];
        if (!validAvailabilities.includes(availability)) return null;
        
        // ENCUMBRANCE
        if (costIdx + 2 >= parts.length) return null;
        const encumbrance = parseInt(parts[costIdx + 2]) || 0;
        
        // DESCRIPTION (opcional)
        let description = '';
        if (costIdx + 3 < parts.length) {
            description = parts.slice(costIdx + 3).join(' ');
        }
        
        const notesHtml = description ? `<p>${description}</p>` : '';
        
        const now = Date.now();
        return {
            name: name,
            type: "equipment",
            img: "modules/impmal-core/assets/icons/equipment/equipment.webp",
            folder: folder,
            system: {
                notes: {
                    player: notesHtml,
                    gm: ""
                },
                equipped: {
                    value: false,
                    force: false
                },
                encumbrance: {
                    value: encumbrance
                },
                cost: cost,
                availability: availability,
                quantity: 1,
                uses: {
                    value: null,
                    max: null,
                    enabled: false
                },
                test: {
                    difficulty: "challenging",
                    characteristic: "",
                    skill: {
                        key: "",
                        specialisation: ""
                    },
                    self: false
                },
                traits: {
                    list: []
                },
                slots: {
                    list: [],
                    value: 0
                }
            },
            effects: [],
            flags: {},
            _id: ImperiumUtils.generateId(),
            _stats: { createdTime: now, modifiedTime: now }
        };
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
                    <option value="vehicle">Vehicles</option>
                    <option value="power">Psychic Powers</option>
                    <option value="talent">Talents</option>
                    <option value="boon">Boons & Liabilities</option>
                    <option value="augmetic">Augmetics</option>
                    <option value="weapon">Weapons</option>
                    <option value="armour">Armour</option>
                    <option value="explosive">Explosives</option>
                    <option value="equipment">Equipment</option>
                </select>
            </div>
            <div class="form-group" id="autocalc-settings" style="display: none;">
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
                <textarea id="impmal-text" rows="30" style="width: 100%; font-family: monospace;" placeholder=""></textarea>
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
                vehicle: "CARGO HAULER\\nVehicle, Wheeled\\nArmour Speed Crew\\n10/6 Slow 1\\nPassengers Size\\n3 Large\\nTRAITS\\nRugged: This vehicle ignores difficult terrain\\nWEAPONS\\nStubber (Crew): Ranged (Projectile) 5 Damage Short Range. Loud\\nNOTES\\nA sturdy cargo vehicle...",
                power: "*Pyromancy Powers\\nºpyromancy\\n\\nPLASMA TORCH\\nCognomens: The Searing Touch\\nWarp Rating: 2\\nDifficulty: Challenging (+0)\\nRange: Self\\nTarget: Self\\nDuration: Sustained\\nYour hand becomes wreathed...",
                talent: "*Combat Talents\\nTENACIOUS\\nIt's tough to keep you down. Whenever you suffer\\nthe Stunned Condition, you may immediately\\nmake a Challenging (+0) Fortitude (Endurance)\\nTest to recover from the Condition.",
                boon: "ºboon\\nAMELIORATOR\\nYour Patron is obsessed with improving both\\nyour weapons and your bodies...\\n\\nºliability\\nPARANOID\\nYour Patron trusts no one...",
                augmetic: "*Augmetics\\nAUGMETIC ARM\\nAmong the more common augmetic parts in the\\nImperium, these limbs can be seen everywhere from\\nbattlefields to manufactorums...",
                weapon: "*Melee Weapons\\nBlink-Blade One-handed 3+StrB 1 8,000 Exotic Penetrating (2)",
                armour: "*Armour\\nEnforcer Carapace All 5 4 1,800 Rare Heavy (4), Loud Details about armour",
                explosive: "*Explosives\\nFrag Grenade Thrown Ordnance 5 1 60 Common Blast (3)",
                equipment: "*Tools\\nAccordion Wire 200 Common 2 A staple of trench warfare...\\nAlmanac Astrae Divinitus 8000 Rare 1"
            };
            
            const hints = {
                npc: "Format: Name detection is automatic. Separate creatures with blank lines.",
                vehicle: "Format: Use *FolderName for folders | Vehicles detected by 'Vehicle, Type' line",
                power: "Format: Use *FolderName for folders | Use ºdiscipline to set power type (pyromancy, minor, biomancy, divination, telekinesis, telepathy, waaagh, or leave empty) | Add * to power name for Overt powers",
                talent: "Format: Use *FolderName for folders | Talents detected by UPPERCASE name lines",
                boon: "Format: Use *FolderName for folders | Use ºcategory to set type (boon, liability) | Default: boon",
                augmetic: "Format: Use *FolderName for folders | Augmetics detected by UPPERCASE name lines | 💀 emoji creates bullet points",
                weapon: "Format: Use *FolderName for folders | Line format: Name Spec Damage Encumbrance Cost Availability Traits",
                armour: "Format: Use *FolderName for folders | Line format: Name Locations Armour Enc Cost Availability [Traits] [Description]",
                explosive: "Format: Use *FolderName for folders | Line format: Name Spec Damage Enc Cost Availability [Traits] [Description]",
                equipment: "Format: Use *FolderName for folders | Line format: Name Cost Availability Encumbrance [Optional Description]"
            };
            
            const labels = {
                npc: "NPCs / Creatures:",
                vehicle: "Vehicles:",
                power: "Psychic Powers:",
                talent: "Talents:",
                boon: "Boons & Liabilities:",
                augmetic: "Augmetics:",
                weapon: "Weapons:",
                armour: "Armour:",
                explosive: "Explosives:",
                equipment: "Equipment:"
            };
            
            contentType.addEventListener('change', function() {
                const type = this.value;
                // AutoCalc solo para NPCs y Vehicles (ambos son Actors con wounds/initiative)
                autoCalcSettings.style.display = (type === 'npc' || type === 'vehicle') ? 'block' : 'none';
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
            rejectClose: false,
            options: {
                width: 1000,
                height: "auto"
            }
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
        } else if (result.contentType === 'augmetic') {
            parser = new ImperiumAugmeticParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Augmetic";
        } else if (result.contentType === 'weapon') {
            parser = new ImperiumWeaponParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Weapon";
        } else if (result.contentType === 'armour') {
            parser = new ImperiumArmourParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Armour";
        } else if (result.contentType === 'explosive') {
            parser = new ImperiumExplosiveParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Explosive";
        } else if (result.contentType === 'equipment') {
            parser = new ImperiumEquipmentParser();
            parseResult = await parser.parseInput(result.text.trim());
            entityType = Item;
            entityLabel = "Equipment";
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

        // Sistema de carpetas: crear un mapa de carpetas
        const folderMap = new Map(); // folderName -> folderId
        
        // Recolectar todas las carpetas únicas mencionadas en los items
        for (const itemData of items) {
            if (itemData.folder && typeof itemData.folder === 'string') {
                const folderName = itemData.folder;
                if (!folderMap.has(folderName)) {
                    folderMap.set(folderName, null); // Marcar para buscar/crear
                }
            }
        }
        
        // Crear o buscar todas las carpetas necesarias
        for (const [folderName, existingId] of folderMap.entries()) {
            if (existingId) continue; // Ya tiene ID
            
            try {
                // Determinar el tipo de carpeta basado en entityType
                const folderType = entityType.name; // "Actor" o "Item"
                
                // Buscar si la carpeta ya existe
                let existingFolder = game.folders.find(f => 
                    f.name === folderName && f.type === folderType
                );
                
                if (existingFolder) {
                    folderMap.set(folderName, existingFolder.id);
                    ImperiumUtils.log(`Using existing folder: ${folderName} (${existingFolder.id})`);
                } else {
                    // Crear nueva carpeta
                    const newFolder = await Folder.create({
                        name: folderName,
                        type: folderType,
                        folder: folderId || null, // Parent folder si el usuario hizo click derecho
                        color: "#" + Math.floor(Math.random()*16777215).toString(16)
                    });
                    
                    if (newFolder) {
                        folderMap.set(folderName, newFolder.id);
                        ImperiumUtils.log(`Created folder: ${folderName} (${newFolder.id})`);
                        ui.notifications.info(`Folder created: ${folderName}`);
                    }
                }
            } catch (error) {
                ImperiumUtils.log(`Error with folder ${folderName}: ${error.message}`);
                ui.notifications.warn(`Could not create folder: ${folderName}`);
            }
        }
        
        // Ahora crear los items con los folderIds correctos
        for (const itemData of items) {
            try {
                ImperiumUtils.log(`Creating ${entityLabel}: ${itemData.name}`);
                
                // Convertir nombre de carpeta a ID si es necesario
                if (itemData.folder && typeof itemData.folder === 'string') {
                    const folderName = itemData.folder;
                    const actualFolderId = folderMap.get(folderName);
                    itemData.folder = actualFolderId || null;
                }
                
                // Si no tiene carpeta pero el usuario hizo click derecho en una, usar esa
                if (!itemData.folder && folderId) {
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
