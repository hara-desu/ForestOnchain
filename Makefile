-include .env

deploy-anvil:
	forge script script/DeployLowkickStarter.s.sol:DeployLowkickStarter \
		--rpc-url $(ANVIL_RPC_URL) \
		--broadcast \
		--private-key $(ANVIL_PRIVATE_KEY) \
		-vvvv

test-specific:
	forge test --mt $(TEST) -vvvv

deploy-sepolia:
	forge script script/DeployLowkickStarter.s.sol:DeployLowkickStarterSepolia \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--broadcast 