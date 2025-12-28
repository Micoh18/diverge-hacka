#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, Symbol,
};

// --------------------------------------------------------------------------------
// 1. Estructuras de Datos y Claves de Almacenamiento
// --------------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Salt,
    SessionCount,
    Therapist(Address),
    Session(u32),
    MonthlyStats(BytesN<32>, u32, Symbol),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Session {
    pub id: u32,
    pub beneficiary_id: BytesN<32>,
    pub therapist: Address,
    pub timestamp: u64,
    pub kind: Symbol,
    pub status: Symbol,
}

// --------------------------------------------------------------------------------
// 2. Lógica del Contrato
// --------------------------------------------------------------------------------

#[contract]
pub struct DivergeProofOfService;

#[contractimpl]
impl DivergeProofOfService {
    
    pub fn init(env: Env, admin: Address, salt: BytesN<32>) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("ALREADY_INITIALIZED");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Salt, &salt);
        env.storage().instance().set(&DataKey::SessionCount, &0u32);
        
        env.storage().instance().extend_ttl(50_000, 100_000);
    }

    pub fn set_therapist(env: Env, therapist: Address, active: bool) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("NOT_INIT");
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Therapist(therapist.clone()), &active);
        
        if active {
            env.storage().persistent().extend_ttl(
                &DataKey::Therapist(therapist), 
                50_000, 
                100_000
            );
        }
    }

    pub fn record_session(
        env: Env,
        therapist: Address,
        beneficiary_name: Bytes,
        beneficiary_pin: Bytes,
        kind: Symbol,
        status: Symbol,
        yyyymm: u32
    ) -> u32 {
        therapist.require_auth();

        let is_allowed: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Therapist(therapist.clone()))
            .unwrap_or(false);

        if !is_allowed {
            panic!("THERAPIST_NOT_AUTHORIZED");
        }

        let salt: BytesN<32> = env.storage().instance().get(&DataKey::Salt).expect("NO_SALT");
        
        let mut preimage = Bytes::new(&env);
        preimage.append(&salt.into());
        preimage.append(&beneficiary_name);
        preimage.append(&beneficiary_pin);
        
        let beneficiary_id_hash = env.crypto().sha256(&preimage);
        let beneficiary_id: BytesN<32> = beneficiary_id_hash.into();

        let mut count: u32 = env.storage().instance().get(&DataKey::SessionCount).unwrap_or(0);
        count += 1;

        // CORRECCIÓN: Clonamos `kind` aquí porque se "mueve" dentro del struct Session
        let session = Session {
            id: count,
            beneficiary_id: beneficiary_id.clone(),
            therapist: therapist.clone(),
            timestamp: env.ledger().timestamp(),
            kind: kind.clone(),  // <--- .clone() agregado
            status: status.clone(),
        };

        let session_key = DataKey::Session(count);
        env.storage().persistent().set(&session_key, &session);
        env.storage().persistent().extend_ttl(&session_key, 530_000, 535_680);

        // CORRECCIÓN: Clonamos `kind` porque el original ya se movió al struct Session arriba
        // (Aunque Session tomó una copia clonada, la variable `kind` original sigue disponible si no se hubiera movido, 
        // pero para evitar líos con el compilador, usamos el clone explícito en la línea anterior y aquí usamos `kind` de nuevo o un clone)
        // MEJOR AÚN: Usamos `kind` directamente aquí si arriba usamos `.clone()`, pero como arriba "movimos" el clone, 
        // la variable `kind` original sigue viva. El problema original era que `kind` se movía al `DataKey` y LUEGO se usaba en event.
        
        // Estrategia: 
        // 1. Usar `kind.clone()` para DataKey
        // 2. Usar `kind` (original) para Session
        // 3. Usar `kind.clone()` para Event
        
        // Reordenando para claridad y seguridad:
        
        let stats_key = DataKey::MonthlyStats(beneficiary_id, yyyymm, kind.clone()); // <--- .clone() para usarla aquí
        let current_stats: u32 = env.storage().persistent().get(&stats_key).unwrap_or(0);
        env.storage().persistent().set(&stats_key, &(current_stats + 1));
        env.storage().persistent().extend_ttl(&stats_key, 530_000, 535_680);

        env.storage().instance().set(&DataKey::SessionCount, &count);

        // Emitimos evento usando `kind` (todavía tenemos ownership o podemos clonar de nuevo)
        env.events().publish(
            (symbol_short!("new_sess"), kind), // Aquí se consume finalmente `kind`
            session
        );

        count
    }

    pub fn get_session(env: Env, id: u32) -> Session {
        env.storage().persistent().get(&DataKey::Session(id)).expect("SESSION_NOT_FOUND")
    }

    pub fn get_monthly_count(
        env: Env, 
        name: Bytes, 
        pin: Bytes, 
        yyyymm: u32, 
        kind: Symbol
    ) -> u32 {
        let salt: BytesN<32> = env.storage().instance().get(&DataKey::Salt).expect("NO_SALT");
        let mut preimage = Bytes::new(&env);
        preimage.append(&salt.into());
        preimage.append(&name);
        preimage.append(&pin);
        
        let bid_hash = env.crypto().sha256(&preimage);
        let bid: BytesN<32> = bid_hash.into();
        
        env.storage().persistent().get(&DataKey::MonthlyStats(bid, yyyymm, kind)).unwrap_or(0)
    }
}

// --------------------------------------------------------------------------------
// Tests Unitarios
// --------------------------------------------------------------------------------
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, Vec};

    #[test]
    fn test_flow_completo() {
        let env = Env::default();
        env.mock_all_auths(); 

        let contract_id = env.register_contract(None, DivergeProofOfService);
        let client = DivergeProofOfServiceClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let therapist = Address::generate(&env);
        let salt = BytesN::from_array(&env, &[0u8; 32]); 

        client.init(&admin, &salt);
        client.set_therapist(&therapist, &true);

        let name = Bytes::from_slice(&env, b"Juan Perez");
        let pin = Bytes::from_slice(&env, b"1234");
        let kind = symbol_short!("KINESIO");
        let status = symbol_short!("OK");
        let mes = 202512;

        let session_id = client.record_session(
            &therapist, 
            &name, 
            &pin, 
            &kind, 
            &status, 
            &mes
        );

        assert_eq!(session_id, 1);

        let session = client.get_session(&1);
        assert_eq!(session.kind, kind);
        assert_eq!(session.therapist, therapist);

        let count = client.get_monthly_count(&name, &pin, &mes, &kind);
        assert_eq!(count, 1);
    }
}
