describe('Accounts', () => {

    it('cannot commit a wrong block', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const block = await testBlockchain.createBlock();
            const accounts = await Accounts.createVolatile();
            let error_thrown = false;
            try {
                await accounts.commitBlock(block);
            } catch (e) {
                error_thrown = true;
            }
            expect(error_thrown).toBe(true);
        })().then(done, done.fail);
    });

    it('can apply and revert a block', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const accounts = testBlockchain.accounts;

            const accountsHash1 = await accounts.hash();
            const block = await testBlockchain.createBlock();
            await accounts.commitBlock(block, testBlockchain.transactionCache);
            testBlockchain.transactionCache.pushBlock(block);

            let accountsHash2 = await accounts.hash();
            expect(accountsHash1.equals(accountsHash2)).toEqual(false);

            await accounts.revertBlock(block, testBlockchain.transactionCache);
            testBlockchain.transactionCache.revertBlock(block);
            accountsHash2 = await accounts.hash();
            expect(accountsHash1.equals(accountsHash2)).toEqual(true);
        })().then(done, done.fail);
    });

    it('cannot revert invalid blocks', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const accounts = testBlockchain.accounts;

            const accountsHash1 = await accounts.hash();
            let block = await testBlockchain.createBlock();
            await accounts.commitBlock(block, testBlockchain.transactionCache);
            testBlockchain.transactionCache.pushBlock(block);

            let accountsHash2 = await accounts.hash();
            expect(accountsHash1.equals(accountsHash2)).toEqual(false);

            block = await testBlockchain.createBlock();

            let threw = false;
            try {
                await accounts.revertBlock(block, testBlockchain.transactionCache);
                testBlockchain.transactionCache.revertBlock(block);
            } catch (e) {
                threw = true;
            }
            expect(threw).toEqual(true);
        })().then(done, done.fail);
    });

    it('can apply and revert a block with multiple transaction per sender', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 5);
            const accounts = testBlockchain.accounts;
            const user0 = testBlockchain.users[0];
            const user1 = testBlockchain.users[1];
            const user2 = testBlockchain.users[2];
            const user3 = testBlockchain.users[3];
            const user4 = testBlockchain.users[4];

            const accountsHash1 = await accounts.hash();

            const tx1 = TestBlockchain.createTransaction(user0.publicKey, user1.address, 1, 0, 1, user0.privateKey);
            const tx2 = TestBlockchain.createTransaction(user0.publicKey, user2.address, 1, 0, 1, user0.privateKey);
            const tx3 = TestBlockchain.createTransaction(user0.publicKey, user3.address, 1, 0, 1, user0.privateKey);
            const tx4 = TestBlockchain.createTransaction(user0.publicKey, user4.address, 1, 0, 1, user0.privateKey);
            const block = await testBlockchain.createBlock({transactions: [tx4, tx2, tx1, tx3], minerAddr: user1.address});
            const status = await testBlockchain.pushBlock(block);
            expect(status).toBe(FullChain.OK_EXTENDED);

            let accountsHash2 = await accounts.hash();
            expect(accountsHash1.equals(accountsHash2)).toEqual(false);

            await accounts.revertBlock(block, testBlockchain.transactionCache);
            accountsHash2 = await accounts.hash();
            expect(accountsHash1.equals(accountsHash2)).toEqual(true);
        })().then(done, done.fail);
    });

    it('put and get an account', (done) => {
        const balance = 42;
        const accountState1 = new BasicAccount(balance);
        const accountAddress = Address.unserialize(BufferUtils.fromBase64(Dummy.address2));

        (async function () {
            const account = await Accounts.createVolatile();
            await account._tree.put(accountAddress, accountState1);
            const state1 = await account.get(accountAddress);
            expect(state1.balance).toBe(accountState1.balance);

            // Verify that get() returns Account.INITIAL when called with an unknown address
            const state2 = await account.get(Address.unserialize(BufferUtils.fromBase64(Dummy.address3)));
            expect(Account.INITIAL.equals(state2)).toBe(true);
        })().then(done, done.fail);
    });

    it('correctly rewards miners', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const user1 = testBlockchain.users[0];
            const user2 = testBlockchain.users[1];
            const user3 = testBlockchain.users[2];
            const user4 = testBlockchain.users[3];
            const accounts = testBlockchain.accounts;

            // initial setup: user1 mined genesis block with no transactions, user2 has a balance of 0
            let balance = (await accounts.get(user2.address)).balance;
            expect(balance).toBe(0);

            const amount1 = 20;
            const fee1 = 10;
            const amount2 = 15;
            const fee2 = 5;
            const transactions = [
                TestBlockchain.createTransaction(user1.publicKey, user3.address, amount1, fee1, 1, user1.privateKey),
                TestBlockchain.createTransaction(user1.publicKey, user4.address, amount2, fee2, 1, user1.privateKey)
            ];
            const block = await testBlockchain.createBlock({
                transactions: transactions,
                minerAddr: user2.address
            });

            await accounts.commitBlock(block, testBlockchain.transactionCache);

            // now: expect user2 to have received the transaction fees and block reward
            balance = (await testBlockchain.accounts.get(user2.address, Account.Type.BASIC)).balance;
            expect(balance).toBe(Policy.blockRewardAt(block.height) + fee1 + fee2);

        })().then(done, done.fail);
    });

    it('can safely roll-back an invalid block', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const user1 = testBlockchain.users[0];  // sender tx 1
            const user2 = testBlockchain.users[1];  // sender tx 2
            const user3 = testBlockchain.users[2];  // receiver tx 1 + 2
            const user4 = testBlockchain.users[3];  // receiver fees tx 1 + 2

            const amount1 = 250;
            const amount2 = 7;
            const fee = 3;
            // user1 -- 250(+3) --> user3 (valid)
            // user2 ---- 7(+3) --> user3 (invalid, user2 has balance 0)
            const transactions = [
                TestBlockchain.createTransaction(user1.publicKey, user3.address, amount1, fee, 0, user1.privateKey),
                TestBlockchain.createTransaction(user2.publicKey, user3.address, amount2, fee, 0, user1.privateKey)
            ];

            const block = await testBlockchain.createBlock({transactions: transactions});

            const accounts = testBlockchain.accounts;
            // we expect rejection of block
            try {
                await accounts.commitBlock(block, testBlockchain.transactionCache);
            } catch (e) {
                const balance1 = (await accounts.get(user1.address, Account.Type.BASIC)).balance;
                const balance3 = (await accounts.get(user3.address)).balance;
                const balance4 = (await accounts.get(user4.address)).balance;
                expect(balance1).toBe(Policy.blockRewardAt(block.height - 1));
                expect(balance3).toBe(0);
                expect(balance4).toBe(0);
                done();
                return;
            }
            throw 'Invalid block not rejected';
        })().then(done, done.fail);
    });

    it('can handle a large amount of block transactions', (done) => {
        (async function test() {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const accounts = testBlockchain.accounts;
            const numTransactions = 720;
            const sender = testBlockchain.users[0];

            const transactions = [];
            for (let i = 0; i < numTransactions; i++) {
                const recipient = Address.fromHash(Hash.blake2b(BufferUtils.fromAscii(`tx${i}`)));
                transactions.push(TestBlockchain.createTransaction(sender.publicKey, recipient, 1, 1, 1, sender.privateKey));
            }
            transactions.sort((a, b) => a.compareBlockOrder(b));

            const time = new Time();
            const block = await testBlockchain.createBlock({
                transactions: transactions
            });
            expect(await block.verify(time)).toBeTruthy();
            expect(await accounts.commitBlock(block, testBlockchain.transactionCache)).toBeTruthy();
        })().then(done, done.fail);
    });

    // note that a lot of possible errors are already tested in the blockchain, transaction and block specs.
    it('rejects invalid transactions', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0, 4);
            const user1 = testBlockchain.users[0];
            const user2 = testBlockchain.users[1];
            const user3 = testBlockchain.users[2];
            const accounts = testBlockchain.accounts;

            // sender balance not enough (amount + fee > block reward)
            const transaction = TestBlockchain.createTransaction(user1.publicKey, user2.address, Policy.blockRewardAt(1) + 5, 1, 0, user1.privateKey);
            const block = await testBlockchain.createBlock({
                transactions: [transaction],
                minerAddr: user3.address
            });
            let error = false;
            try {
                await accounts.commitBlock(block, testBlockchain.transactionCache);
            } catch(e) {
                expect(e.message.toLowerCase()).toContain('balance error!');
                error = true;
            }
            expect(error).toBe(true);

            // sender balance will be enough AFTER block is mined -> make sender also miner (should still fail)
            block.body._minerAddr = user1.address;
            error = false;
            try {
                await accounts.commitBlock(block, testBlockchain.transactionCache);
            } catch(e) {
                expect(e.message.toLowerCase()).toContain('balance error!');
                error = true;
            }
            expect(error).toBe(true);

        })().then(done, done.fail);
    });

    it('can initialize genesis accounts', (done) => {
        (async () => {
            const map = new Map();
            map.set(Address.fromBase64(Dummy.address1), new BasicAccount(5));
            map.set(Address.fromBase64(Dummy.address2), new VestingContract(10, Address.fromBase64(Dummy.address2), 0, 10, 2));
            map.set(Address.fromBase64(Dummy.address3), new VestingContract(20, Address.fromBase64(Dummy.address1), 0, 20, 5));

            let size = 2;
            for (const entry of map.entries()) {
                size += entry[0].serializedSize + entry[1].serializedSize;
            }

            const buf = new SerialBuffer(size);
            buf.writeUint16(map.size);
            for (const entry of map.entries()) {
                entry[0].serialize(buf);
                entry[1].serialize(buf);
            }

            const genesis = new Block(
                new BlockHeader(Hash.NULL, Hash.NULL, GenesisConfig.GENESIS_BLOCK.bodyHash, Hash.fromBase64('IDpF4aKOYPHMBBOHHoTvF8SdybqwwtQ7qd3AFgWq1sU=') /* TODO */, BlockUtils.difficultyToCompact(1), 1, 0, 0),
                GenesisConfig.GENESIS_BLOCK.interlink,
                GenesisConfig.GENESIS_BLOCK.body
            );
            const accounts = await Accounts.createVolatile();
            await accounts.initialize(genesis, BufferUtils.toBase64(buf));

            expect((await accounts.get(genesis.minerAddr)).equals(new BasicAccount(Policy.blockRewardAt(1)))).toBe(true);
            for (const entry of map.entries()) {
                expect((await accounts.get(entry[0])).equals(entry[1])).toBe(true);
            }
        })().then(done, done.fail);
    });

    it('correctly identifies accounts that should be pruned (no pruning)', (done) => {
        (async () => {
            const signerWallet = Wallet.generate();
            const signerAddress = signerWallet.address;
            const contractAddress = Address.fromBase64(Dummy.address1);
            const recipientAddress = Address.fromBase64(Dummy.address2);

            const accounts = await Accounts.createVolatile();
            const contract = new VestingContract(10, signerAddress, 0, 0, 0, 0);
            expect(contract.getMinCap(2)).toBe(0);
            await accounts._tree.put(contractAddress, contract);

            const tx1 = new ExtendedTransaction(contractAddress, Account.Type.VESTING,
                recipientAddress, Account.Type.BASIC,
                5, 0, 1, Transaction.Flag.NONE, new Uint8Array(0));
            tx1.proof = signerWallet.signTransaction(tx1).serialize();

            const transactions = [tx1];
            const toBePruned = await accounts.gatherToBePrunedAccounts(transactions, 2, new TransactionCache());
            expect(toBePruned.length).toBe(0);
        })().then(done, done.fail);
    });

    it('correctly identifies accounts that should be pruned (single transaction)', (done) => {
        (async () => {
            const signerWallet = Wallet.generate();
            const signerAddress = signerWallet.address;
            const contractAddress = Address.fromBase64(Dummy.address1);
            const recipientAddress = Address.fromBase64(Dummy.address2);

            const accounts = await Accounts.createVolatile();
            const contract = new VestingContract(10, signerAddress, 0, 0, 0, 0);
            expect(contract.getMinCap(2)).toBe(0);
            await accounts._tree.put(contractAddress, contract);

            const tx1 = new ExtendedTransaction(contractAddress, Account.Type.VESTING,
                recipientAddress, Account.Type.BASIC,
                10, 0, 1, Transaction.Flag.NONE, new Uint8Array(0));
            tx1.proof = signerWallet.signTransaction(tx1).serialize();

            const transactions = [tx1];
            const toBePruned = await accounts.gatherToBePrunedAccounts(transactions, 2, new TransactionCache());
            expect(toBePruned.length).toBe(1);
            expect(toBePruned[0].address.equals(contractAddress)).toBe(true);
            expect(toBePruned[0].account.equals(contract));
        })().then(done, done.fail);
    });

    it('correctly identifies accounts that should be pruned (multiple transactions)', (done) => {
        (async () => {
            const signerWallet = Wallet.generate();
            const signerAddress = signerWallet.address;
            const contractAddress = Address.fromBase64(Dummy.address1);
            const recipientAddress = Address.fromBase64(Dummy.address2);

            const accounts = await Accounts.createVolatile();
            const contract = new VestingContract(10, signerAddress, 0, 0, 0, 0);
            expect(contract.getMinCap(2)).toBe(0);
            await accounts._tree.put(contractAddress, contract);

            const tx1 = new ExtendedTransaction(contractAddress, Account.Type.VESTING,
                recipientAddress, Account.Type.BASIC,
                5, 0, 1, Transaction.Flag.NONE, new Uint8Array(0));
            tx1.proof = signerWallet.signTransaction(tx1).serialize();

            const tx2 = new ExtendedTransaction(contractAddress, Account.Type.VESTING,
                recipientAddress, Account.Type.BASIC,
                5, 0, 1, Transaction.Flag.NONE, new Uint8Array(1));
            tx2.proof = signerWallet.signTransaction(tx2).serialize();

            const transactions = [tx1, tx2];
            const toBePruned = await accounts.gatherToBePrunedAccounts(transactions, 2, new TransactionCache());
            expect(toBePruned.length).toBe(1);
            expect(toBePruned[0].address.equals(contractAddress)).toBe(true);
            expect(toBePruned[0].account.equals(contract));
        })().then(done, done.fail);
    });

    it('correctly identifies accounts that should be pruned (multiple transactions/accounts)', (done) => {
        (async () => {
            const signerWallet = Wallet.generate();
            const signerAddress = signerWallet.address;
            const contractAddress1 = Address.fromBase64(Dummy.address1);
            const contractAddress2 = Address.fromBase64(Dummy.address2);
            const contractAddress3 = Address.fromBase64(Dummy.address3);
            const recipientAddress1 = Address.fromBase64(Dummy.address4);
            const recipientAddress2 = Address.fromBase64(Dummy.address5);

            const accounts = await Accounts.createVolatile();
            const contract1 = new VestingContract(10, signerAddress, 0, 0, 0, 0);
            expect(contract1.getMinCap(2)).toBe(0);
            await accounts._tree.put(contractAddress1, contract1);

            const contract2 = new VestingContract(20, signerAddress, 0, 0, 0, 0);
            expect(contract2.getMinCap(2)).toBe(0);
            await accounts._tree.put(contractAddress2, contract2);

            const contract3 = new VestingContract(30, signerAddress, 0, 0, 0, 0);
            expect(contract3.getMinCap(2)).toBe(0);
            await accounts._tree.put(contractAddress3, contract3);

            const tx1 = new ExtendedTransaction(contractAddress1, Account.Type.VESTING,
                recipientAddress1, Account.Type.BASIC,
                5, 0, 1, Transaction.Flag.NONE, new Uint8Array(0));
            tx1.proof = signerWallet.signTransaction(tx1).serialize();

            const tx2 = new ExtendedTransaction(contractAddress1, Account.Type.VESTING,
                recipientAddress2, Account.Type.BASIC,
                4, 1, 1, Transaction.Flag.NONE, new Uint8Array(0));
            tx2.proof = signerWallet.signTransaction(tx2).serialize();

            const tx3 = new ExtendedTransaction(contractAddress2, Account.Type.VESTING,
                recipientAddress2, Account.Type.BASIC,
                18, 0, 1, Transaction.Flag.NONE, new Uint8Array(0));
            tx3.proof = signerWallet.signTransaction(tx3).serialize();

            const tx4 = new ExtendedTransaction(contractAddress2, Account.Type.VESTING,
                recipientAddress2, Account.Type.BASIC,
                1, 0, 1, Transaction.Flag.NONE, new Uint8Array(1));
            tx4.proof = signerWallet.signTransaction(tx4).serialize();

            const tx5 = new ExtendedTransaction(contractAddress2, Account.Type.VESTING,
                recipientAddress1, Account.Type.BASIC,
                1, 0, 1, Transaction.Flag.NONE, new Uint8Array(2));
            tx5.proof = signerWallet.signTransaction(tx5).serialize();

            const tx6 = new ExtendedTransaction(contractAddress3, Account.Type.VESTING,
                recipientAddress1, Account.Type.BASIC,
                29, 0, 1, Transaction.Flag.NONE, new Uint8Array(2));
            tx6.proof = signerWallet.signTransaction(tx6).serialize();

            const transactions = [tx1, tx2, tx3, tx4, tx5, tx6];
            const toBePruned = await accounts.gatherToBePrunedAccounts(transactions, 2, new TransactionCache());
            expect(toBePruned.length).toBe(2);
            expect(toBePruned[0].address.equals(contractAddress2)).toBe(true);
            expect(toBePruned[0].account.equals(contract2));
            expect(toBePruned[1].address.equals(contractAddress1)).toBe(true);
            expect(toBePruned[1].account.equals(contract1));
        })().then(done, done.fail);
    });
});
