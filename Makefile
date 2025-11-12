-include .env

deploy-anvil:
	forge script script/DeployForestOnchain.s.sol:DeployForestOnchainLocal \
		--rpc-url $(ANVIL_RPC_URL) \
		--broadcast \
		--private-key $(ANVIL_PRIVATE_KEY) \
		-vvvv

test-specific:
	forge test --mt $(TEST) -vvvv

deploy-sepolia:
	forge script script/DeployForestOnchain.s.sol:DeployForestOnchainSepolia \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--broadcast \
		--verify \
    	--etherscan-api-key $(ETHERSCAN_API_KEY)